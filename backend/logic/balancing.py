"""
Balancing rules + simulation helpers.

This module does two things:
- generate rule-based suggestions from aggregated metrics (e.g., "time too tight")
- simulate the expected impact of a change without actually modifying stored configs

The simulation is intentionally "lightweight" — it’s not a full game model, but
it gives designers a directional estimate for dashboard previews.
"""
import json
from typing import Any, Dict, List

from data.db import get_connection
from logic.metrics import get_fairness_metrics, get_stage_stats
from models import EventType


def _clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
    """Clamp a numeric value to a closed interval."""
    return max(min_value, min(value, max_value))


def get_suggestions(config_id: str):
    """Generate balancing suggestions for a config based on telemetry-derived metrics."""
    stage_stats = get_stage_stats(config_id)["stats"]
    fairness = get_fairness_metrics("fast_vs_slow", config_id)["stages"]
    # Map fairness metrics by stage for quick lookup.
    fairness_by_stage = {item["stage_id"]: item for item in fairness}
    suggestions: List[Dict[str, Any]] = []

    for stage in stage_stats:
        # Evaluate rule triggers per stage and append suggestions when thresholds are hit.
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
    """Sum helper-related cost deltas in a change payload (used as a sanity check)."""
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


def _micro_nudge_completion(timer_delta: int, move_delta: int) -> float:
    """Tiny bump so small easing changes still show up (positive deltas only)."""
    n = 0.0
    if timer_delta > 0:
        n += timer_delta * 0.001
    if move_delta > 0:
        n += move_delta * 0.0025
    return n


def _survival_fraction(base: int, delta: int) -> float:
    """
    Fraction of clears that still succeed after applying delta to a limit (timer or moves).
    delta >= 0: no extra losses from this axis. delta < 0: scale by (base + delta) / base, or 0 if exhausted.
    """
    if delta >= 0:
        return 1.0
    b = int(base)
    if b <= 0:
        return 0.0
    effective = b + int(delta)
    if effective <= 0:
        return 0.0
    return min(1.0, effective / float(b))


def _fetch_stage_limits(conn, config_id: str, stage_id: int):
    """Fetch current stage limits from DB, with safe defaults if missing."""
    row = conn.execute(
        """
        SELECT timer_seconds, move_limit
        FROM stages
        WHERE config_id = ? AND stage_id = ?
        """,
        (config_id, stage_id),
    ).fetchone()
    if not row:
        return 60, 20
    return int(row["timer_seconds"] or 60), int(row["move_limit"] or 20)


def _pressure_ease_from_limit_deltas(
    timer_delta: int, move_delta: int, base_timer: int, base_moves: int
) -> tuple[float, float]:
    """Normalized [0,1] pressure (tighter limits) and ease (more forgiving) for quit heuristic."""
    bt = max(1, int(base_timer))
    bm = max(1, int(base_moves))
    pressure = 0.0
    if timer_delta < 0:
        pressure += min(1.0, abs(timer_delta) / float(bt))
    if move_delta < 0:
        pressure += min(1.0, abs(move_delta) / float(bm))
    pressure = min(1.0, pressure / 2.0)

    ease = 0.0
    if timer_delta > 0:
        ease += min(1.0, timer_delta / float(bt))
    if move_delta > 0:
        ease += min(1.0, move_delta / float(bm))
    ease = min(1.0, ease / 2.0)
    return pressure, ease


def _adjust_quit_rate_from_limit_deltas(
    completion_rate: float,
    failure_rate: float,
    quit_rate: float,
    timer_delta: int,
    move_delta: int,
    base_timer: int,
    base_moves: int,
) -> tuple[float, float, float, float, float]:
    """
    Shift quit rate when limits change; rebalance completion vs failure among non-quit outcomes.
    Returns (c_new, f_new, q_new, pressure, ease).
    """
    pressure, ease = _pressure_ease_from_limit_deltas(
        timer_delta, move_delta, base_timer, base_moves
    )
    k = 0.28
    q_new = _clamp(quit_rate + k * (pressure - ease), 0.0, 1.0)
    nonq = completion_rate + failure_rate
    rem = max(0.0, 1.0 - q_new)
    if nonq <= 1e-12:
        c_new = rem
        f_new = 0.0
    else:
        c_new = rem * (completion_rate / nonq)
        f_new = rem * (failure_rate / nonq)
    return c_new, f_new, q_new, pressure, ease


def simulate_balance_change(payload):
    """Simulate balance changes for one config without mutating stored data."""
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
            base_timer, base_moves = _fetch_stage_limits(conn, config_id, stage_id)

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

        # Track converted fail sources using a simple proportional model.
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

        # Negative timer/move: fewer clears survive (scaled by effective budget vs base limits).
        if timer_delta < 0 or move_delta < 0:
            surv_t = _survival_fraction(base_timer, timer_delta)
            surv_m = _survival_fraction(base_moves, move_delta)
            surv = surv_t * surv_m
            new_completes = int(max(0, min(adjusted_completes, round(adjusted_completes * surv))))
            lost_clears = adjusted_completes - new_completes
            adjusted_completes = new_completes
            adjusted_fails += lost_clears
            notes_extra = (
                f"Tighter limits vs this stage's current timer ({base_timer}s) and move cap ({base_moves}): "
                f"about {surv * 100:.0f}% of prior clears would still fit ({lost_clears} clears → fails)."
            )
        else:
            notes_extra = None

        c_rate = adjusted_completes / starts
        f_rate = adjusted_fails / starts
        q_rate = quits / starts

        if timer_delta != 0 or move_delta != 0:
            c_rate, f_rate, q_rate, p, e = _adjust_quit_rate_from_limit_deltas(
                c_rate, f_rate, q_rate, timer_delta, move_delta, base_timer, base_moves
            )
            notes_quit = (
                f"Quit rate adjusted for limit pressure (tighter vs easier): "
                f"pressure {p:.2f}, ease {e:.2f} → estimated quit share {q_rate:.1%}."
            )
        else:
            notes_quit = None

        after = {
            "completion_rate": c_rate,
            "failure_rate": f_rate,
            "quit_rate": q_rate,
        }

        notes = [
            f"This change would likely turn {converted} of {fails} earlier failed runs into clears "
            f"(time-based: {converted_from_time}, move-based: {converted_from_moves})."
        ]
        if notes_extra:
            notes.append(notes_extra)
        if notes_quit:
            notes.append(notes_quit)

        if timer_delta > 0 or move_delta > 0:
            quit_rate = after["quit_rate"]
            max_non_quit = max(0.0, 1.0 - quit_rate)
            completion_rate = _clamp(
                after["completion_rate"] + _micro_nudge_completion(timer_delta, move_delta),
                0.0,
                max_non_quit,
            )
            failure_rate = max(0.0, max_non_quit - completion_rate)
            after = {
                "completion_rate": completion_rate,
                "failure_rate": failure_rate,
                "quit_rate": quit_rate,
            }
            notes.append(
                "A small extra adjustment was added so lighter easing changes still show up in the estimate."
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
