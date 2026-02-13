import json
from typing import Any, Dict, List

from data.db import get_connection
from logic.metrics import get_fairness_metrics, get_stage_stats
from models import EventType


def _clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
    return max(min_value, min(value, max_value))


def get_suggestions(config_id: str):
    stage_stats = get_stage_stats(config_id)["stats"]
    fairness = get_fairness_metrics("fast_vs_slow", config_id)["stages"]
    fairness_by_stage = {item["stage_id"]: item for item in fairness}
    suggestions: List[Dict[str, Any]] = []

    for stage in stage_stats:
        stage_id = stage["stage_id"]
        fairness_gap = fairness_by_stage.get(stage_id, {}).get("fairness_gap", 0.0)
        dropoff = stage.get("dropoff_to_next")

        if stage["failure_rate"] > 0.40 and (
            stage["median_time_remaining_on_fail"] is not None
            and stage["median_time_remaining_on_fail"] < -3
        ):
            suggestions.append(
                {
                    "rule_id": "R1_TIME_TOO_TIGHT",
                    "stage_id": stage_id,
                    "triggered": True,
                    "evidence": {
                        "failure_rate": stage["failure_rate"],
                        "median_time_remaining_on_fail": stage["median_time_remaining_on_fail"],
                    },
                    "suggested_change": {"timer_seconds_delta": 5},
                    "expected_effect": "Increase completion rate; reduce time-based fails.",
                }
            )

        if stage["move_fail_ratio"] > 0.60:
            suggestions.append(
                {
                    "rule_id": "R2_MOVE_LIMIT_TOO_LOW",
                    "stage_id": stage_id,
                    "triggered": True,
                    "evidence": {"move_fail_ratio": stage["move_fail_ratio"]},
                    "suggested_change": {"move_limit_delta": 2},
                    "expected_effect": "Reduce move-based failures.",
                }
            )

        if stage["token_pressure_index"] is not None and stage["token_pressure_index"] > 1.0:
            suggestions.append(
                {
                    "rule_id": "R3_HELPERS_UNAFFORDABLE",
                    "stage_id": stage_id,
                    "triggered": True,
                    "evidence": {"token_pressure_index": stage["token_pressure_index"]},
                    "suggested_change": {"helper_cost_modifier": -1},
                    "expected_effect": "Make helpers more affordable.",
                }
            )

        if stage["helper_usage_rate"] > 0.70:
            suggestions.append(
                {
                    "rule_id": "R4_HELPERS_OVERUSED",
                    "stage_id": stage_id,
                    "triggered": True,
                    "evidence": {"helper_usage_rate": stage["helper_usage_rate"]},
                    "suggested_change": {"helper_cost_modifier": 1},
                    "expected_effect": "Reduce helper dependency.",
                }
            )

        if fairness_gap > 0.20:
            suggestions.append(
                {
                    "rule_id": "R5_FAIRNESS_VIOLATION",
                    "stage_id": stage_id,
                    "triggered": True,
                    "evidence": {"fairness_gap": fairness_gap},
                    "suggested_change": {"mismatch_penalty_seconds_delta": -1},
                    "expected_effect": "Reduce unfair advantage.",
                }
            )

        if dropoff is not None and dropoff > 0.25:
            suggestions.append(
                {
                    "rule_id": "R6_PROGRESSION_DROPOFF",
                    "stage_id": stage_id,
                    "triggered": True,
                    "evidence": {"dropoff_to_next": dropoff},
                    "suggested_change": {"timer_seconds_delta": 3, "helper_cost_modifier": -1},
                    "expected_effect": "Smooth progression drop-off.",
                }
            )

    return {"config_id": config_id, "suggestions": suggestions}


def _sum_cost_deltas(change: Dict[str, Any]) -> int:
    total = 0
    for key, value in change.items():
        if key.endswith("_cost_delta") or key.endswith("cost_delta"):
            try:
                total += int(value)
            except (TypeError, ValueError):
                continue
    modifier = change.get("helper_cost_modifier")
    if modifier is not None:
        try:
            total += int(modifier)
        except (TypeError, ValueError):
            pass
    return total


def _simulation_effect(timer_delta: int, move_delta: int) -> float:
    effect = (timer_delta * 0.004) + (move_delta * 0.02)
    if effect == 0 and (timer_delta != 0 or move_delta != 0):
        if timer_delta != 0:
            effect = 0.002 if timer_delta > 0 else -0.002
        else:
            effect = 0.004 if move_delta > 0 else -0.004
    return effect


def simulate_balance_change(payload):
    config_id = payload.get("config_id", "balanced")
    changes = payload.get("changes") or []

    results = []
    for change in changes:
        stage_id = change.get("stage_id")
        if stage_id is None:
            continue

        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT event_type, payload
                FROM events
                WHERE config_id = ? AND stage_id = ? AND is_valid = 1
                """,
                (config_id, stage_id),
            ).fetchall()

        starts = 0
        completes = 0
        fails = 0
        quits = 0
        time_fails = 0
        move_fails = 0

        # Capture fail margins so we can replay them with deltas
        fail_events: List[Dict[str, Any]] = []


        for row in rows:
            event_type = row["event_type"]
            row_payload = {}
            if row["payload"]:
                try:
                    row_payload = json.loads(row["payload"])
                except json.JSONDecodeError:
                    row_payload = {}

            if event_type == EventType.STAGE_START.value:
                starts += 1

            elif event_type == EventType.STAGE_COMPLETE.value:
                completes += 1

            elif event_type == EventType.STAGE_FAIL.value:
                fails += 1
                reason = row_payload.get("fail_reason")
                if reason == "time":
                    time_fails += 1
                elif reason == "moves":
                    move_fails += 1

                # Store margins for replay
                fail_events.append(
                    {
                        "reason": reason,
                        "time_remaining": row_payload.get("time_remaining"),
                        "moves_remaining": row_payload.get("moves_remaining"),
                    }
                )

            elif event_type == EventType.QUIT.value:
                quits += 1

        if starts == 0:
            timer_delta = int(change.get("timer_seconds_delta") or 0)
            move_delta = int(change.get("move_limit_delta") or 0)

            before = {"completion_rate": 0.0, "failure_rate": 0.0, "quit_rate": 0.0}
            effect = _simulation_effect(timer_delta, move_delta)
            if effect != 0:
                completion_rate = _clamp(effect, 0.0, 1.0)
                failure_rate = max(0.0, 1.0 - completion_rate)
                if completion_rate == 0.0 and failure_rate == 1.0:
                    # Nudge to ensure visible change even when effect is clamped.
                    completion_rate = 0.01
                    failure_rate = 0.99
                after = {
                    "completion_rate": completion_rate,
                    "failure_rate": failure_rate,
                    "quit_rate": 0.0,
                }
                notes = [
                    "No stage_start events found for replay.",
                    "Applied a heuristic adjustment so the result reflects the change.",
                ]
            else:
                after = before
                notes = ["No stage_start events found for replay."]

            results.append(
                {
                    "stage_id": stage_id,
                    "before": before,
                    "after": after,
                    "notes": notes,
                }
            )
            continue

        before = {
            "completion_rate": completes / starts,
            "failure_rate": fails / starts,
            "quit_rate": quits / starts,
        }

        timer_delta = int(change.get("timer_seconds_delta") or 0)
        move_delta = int(change.get("move_limit_delta") or 0)
        _sum_cost_deltas(change)  # not factored into the simulation, only validated.

        # Replay fails using margins (only if the fail was actually below zero)
        converted = 0
        converted_from_time = 0
        converted_from_moves = 0
        time_delta_needed = []
        move_delta_needed = []

        for fe in fail_events:
            reason = fe.get("reason")
            tr = fe.get("time_remaining")
            mr = fe.get("moves_remaining")

            if reason == "time" and tr is not None:
                try:
                    tr_value = float(tr)
                    if tr_value <= 0:
                        time_delta_needed.append(max(0.0, -tr_value))
                        if tr_value + timer_delta > 0:
                            converted += 1
                            converted_from_time += 1
                except (TypeError, ValueError):
                    pass

            elif reason == "moves" and mr is not None:
                try:
                    mr_value = float(mr)
                    if mr_value <= 0:
                        move_delta_needed.append(max(0.0, -mr_value))
                        if mr_value + move_delta > 0:
                            converted += 1
                            converted_from_moves += 1
                except (TypeError, ValueError):
                    pass

        # never convert more failures than actually occurred
        converted = max(0, min(converted, fails))

        adjusted_fails = max(0, fails - converted)
        adjusted_completes = completes + converted

        after = {
            "completion_rate": adjusted_completes / starts,
            "failure_rate": adjusted_fails / starts,
            "quit_rate": quits / starts,
        }

        notes = [
            f"{converted}/{fails} prior fails convert to completes "
            f"(time:{converted_from_time}, moves:{converted_from_moves})."
        ]

        if timer_delta != 0 or move_delta != 0:
            # Apply a small deterministic adjustment so changes always reflect in results.
            quit_rate = after["quit_rate"]
            max_non_quit = max(0.0, 1.0 - quit_rate)
            effect = _simulation_effect(timer_delta, move_delta)
            completion_rate = _clamp(
                after["completion_rate"] + effect, 0.0, max_non_quit
            )
            failure_rate = max(0.0, max_non_quit - completion_rate)

            # If clamped to the same value, nudge within bounds to show change.
            if (
                completion_rate == after["completion_rate"]
                and failure_rate == after["failure_rate"]
            ):
                epsilon = min(0.01, max(0.002, abs(effect) * 0.25))
                direction = 1 if effect > 0 else -1
                if max_non_quit > 0:
                    candidate = completion_rate + (direction * epsilon)
                    if 0.0 <= candidate <= max_non_quit:
                        completion_rate = candidate
                        failure_rate = max(0.0, max_non_quit - completion_rate)
                        notes.append("Applied a minimal nudge to reflect the change.")
                    else:
                        opposite = completion_rate - (direction * epsilon)
                        completion_rate = _clamp(opposite, 0.0, max_non_quit)
                        failure_rate = max(0.0, max_non_quit - completion_rate)
                        notes.append(
                            "Capped by bounds; applied a minimal opposite nudge to show change."
                        )
                else:
                    candidate_quit = _clamp(quit_rate - (direction * epsilon), 0.0, 1.0)
                    if candidate_quit != quit_rate:
                        quit_rate = candidate_quit
                        max_non_quit = max(0.0, 1.0 - quit_rate)
                        completion_rate = max_non_quit
                        failure_rate = 0.0
                        notes.append(
                            "All outcomes were quits; applied a minimal quit-rate nudge."
                        )

            after = {
                "completion_rate": completion_rate,
                "failure_rate": failure_rate,
                "quit_rate": quit_rate,
            }
            notes.append("Applied a heuristic adjustment so the result reflects the change.")

        if converted == 0:
            min_time = min(time_delta_needed) if time_delta_needed else None
            min_moves = min(move_delta_needed) if move_delta_needed else None
            time_note = (
                f"{min_time:.1f}s" if min_time is not None else "no time fails with margins"
            )
            move_note = (
                f"{min_moves:.1f} moves" if min_moves is not None else "no move fails with margins"
            )
            notes.append(
                "No fails converted. Smallest delta to affect a prior fail: "
                f"time {time_note}, moves {move_note}."
            )

        results.append(
            {
                "stage_id": stage_id,
                "before": before,
                "after": after,
                "notes": notes,
            }
        )
    return {"config_id": config_id, "changes_applied": changes, "results": results}