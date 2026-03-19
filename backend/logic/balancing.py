# Suggests balancing changes and simulates effects.
# Uses rules derived from telemetry stats.
import json
from typing import Any, Dict, List

from data.db import get_connection
from logic.metrics import get_fairness_metrics, get_stage_stats
from models import EventType


# Clamp values to a given range.
def _clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
    # Keep values in [min, max].
    return max(min_value, min(value, max_value))


# Generate balancing suggestions from metrics.
def get_suggestions(config_id: str):
    stage_stats = get_stage_stats(config_id)["stats"]
    fairness = get_fairness_metrics("fast_vs_slow", config_id)["stages"]
    # Map fairness metrics by stage for quick lookup.
    fairness_by_stage = {item["stage_id"]: item for item in fairness}
    suggestions: List[Dict[str, Any]] = []

    for stage in stage_stats:
        # Evaluate rule triggers per stage.
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


# Sum helper cost deltas for validation.
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
    # Keep small deltas visible without overpowering the base replay model.
    return (timer_delta * 0.001) + (move_delta * 0.0025)


# Simulate a balance change without mutating data.
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
                WHERE config_id = ? AND stage_id = ?
                """,
                (config_id, stage_id),
            ).fetchall()

        starts = 0
        completes = 0
        fails = 0
        quits = 0
        time_fails = 0
        move_fails = 0

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

            elif event_type == EventType.QUIT.value:
                quits += 1

        if starts == 0:
            results.append(
                {
                    "stage_id": stage_id,
                    "before": {"completion_rate": 0.0, "failure_rate": 0.0, "quit_rate": 0.0},
                    "after": {"completion_rate": 0.0, "failure_rate": 0.0, "quit_rate": 0.0},
                    "notes": ["No stage_start events found for replay."],
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


        # Track converted fail sources using the original proportional model.
        converted_from_time = 0
        converted_from_moves = 0

        if timer_delta > 0 and time_fails > 0:
            reduction_per_second = 0.02
            reduction_factor = min(timer_delta * reduction_per_second, 0.85)
            converted_from_time = int(time_fails * reduction_factor)

        if move_delta > 0 and move_fails > 0:
            reduction_per_move = 0.01
            reduction_factor = min(move_delta * reduction_per_move, 0.85)
            converted_from_moves = int(move_fails * reduction_factor)

        converted = converted_from_time + converted_from_moves
        converted = max(0, min(converted, fails))

        adjusted_fails = max(0, fails - converted)
        adjusted_completes = completes + converted

        after = {
            "completion_rate": adjusted_completes / starts,
            "failure_rate": adjusted_fails / starts,
            "quit_rate": quits / starts,
        }

        notes = [
            f"This change would likely turn {converted} of {fails} earlier failed runs into clears "
            f"(time-based: {converted_from_time}, move-based: {converted_from_moves})."
        ]

        if timer_delta != 0 or move_delta != 0:
            quit_rate = after["quit_rate"]
            max_non_quit = max(0.0, 1.0 - quit_rate)
            completion_rate = _clamp(
                after["completion_rate"] + _simulation_effect(timer_delta, move_delta), 0.0, max_non_quit
            )
            failure_rate = max(0.0, max_non_quit - completion_rate)
            
            after = {
                "completion_rate": completion_rate,
                "failure_rate": failure_rate,
                "quit_rate": quit_rate,
            }
            notes.append("A small extra adjustment was added so lighter changes still show up in the estimate.")

        results.append(
            {
                "stage_id": stage_id,
                "before": before,
                "after": after,
                "notes": notes,
            }
        )
    return {"config_id": config_id, "changes_applied": changes, "results": results}
