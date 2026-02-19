# Computes metrics for dashboards and reports.
# Aggregates telemetry into per-stage stats.
import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from data.db import get_connection
from models import EventType


# Parse ISO timestamps into datetime objects.
def _parse_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value.replace("Z", "+00:00")
        return datetime.fromisoformat(value)
    except ValueError:
        return None


# Compute a mean value or None if empty.
def _mean(values: List[float]) -> Optional[float]:
    # Average helper used across metrics.
    return sum(values) / len(values) if values else None


# Compute a median value or None if empty.
def _median(values: List[float]) -> Optional[float]:
    if not values:
        return None
    # Sort a copy to avoid mutating input.
    sorted_values = sorted(values)
    mid = len(sorted_values) // 2
    if len(sorted_values) % 2 == 1:
        return sorted_values[mid]
    return (sorted_values[mid - 1] + sorted_values[mid]) / 2


# Pull a numeric field from a payload using multiple keys.
def _extract_number(payload: Dict[str, Any], keys: List[str]) -> Optional[float]:
    # Read numeric values from multiple possible keys.
    for key in keys:
        if key in payload and payload[key] is not None:
            try:
                return float(payload[key])
            except (TypeError, ValueError):
                return None
    return None


# Load valid events filtered by config/time.
def _load_events(
    config_id: Optional[str] = None,
    from_ts: Optional[str] = None,
    to_ts: Optional[str] = None,
) -> List[Dict[str, Any]]:
    # Only load validated events for analytics.
    query = "SELECT * FROM events WHERE 1=1 AND is_valid = 1"
    params: List[Any] = []
    if config_id:
        query += " AND config_id = ?"
        params.append(config_id)
    if from_ts:
        query += " AND timestamp >= ?"
        params.append(from_ts)
    if to_ts:
        query += " AND timestamp <= ?"
        params.append(to_ts)
    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    events: List[Dict[str, Any]] = []
    for row in rows:
        payload = {}
        if row["payload"]:
            try:
                payload = json.loads(row["payload"])
            except json.JSONDecodeError:
                payload = {}
        events.append(
            {
                "event_id": row["event_id"],
                "session_id": row["session_id"],
                "user_id": row["user_id"],
                "timestamp": row["timestamp"],
                "stage_id": row["stage_id"],
                "config_id": row["config_id"],
                "event_type": row["event_type"],
                "payload": payload,
            }
        )
    return events


# Aggregate raw events into per-stage statistics.
def _build_stage_metrics(events: List[Dict[str, Any]]) -> Tuple[Dict[int, Dict[str, Any]], Dict[int, List[Dict[str, Any]]]]:
    stats: Dict[int, Dict[str, Any]] = {}
    session_stage_events: Dict[Tuple[str, int], List[Dict[str, Any]]] = {}

    for event in events:
        # Group events per stage and session.
        stage_id = event.get("stage_id")
        if stage_id is None:
            continue
        stage_id = int(stage_id)
        stats.setdefault(
            stage_id,
            {
                "stage_starts": 0,
                "stage_completes": 0,
                "stage_fails": 0,
                "stage_quits": 0,
                "retries": 0,
                "powerup_used": 0,
                "move_fail_count": 0,
                "time_spent": [],
                "time_remaining_on_fail": [],
                "moves_used": [],
                "tokens_earned": [],
                "tokens_spent": [],
                "session_records": [],
            },
        )

        if event["event_type"] == EventType.STAGE_START.value:
            stats[stage_id]["stage_starts"] += 1
        elif event["event_type"] == EventType.STAGE_COMPLETE.value:
            stats[stage_id]["stage_completes"] += 1
        elif event["event_type"] == EventType.STAGE_FAIL.value:
            stats[stage_id]["stage_fails"] += 1
        elif event["event_type"] == EventType.QUIT.value:
            stats[stage_id]["stage_quits"] += 1
        elif event["event_type"] == EventType.RETRY.value:
            stats[stage_id]["retries"] += 1
        elif event["event_type"] == EventType.POWERUP_USED.value:
            stats[stage_id]["powerup_used"] += 1

        session_id = event.get("session_id") or "unknown"
        session_stage_events.setdefault((session_id, stage_id), []).append(event)

        if event["event_type"] == EventType.STAGE_FAIL.value:
            # Track fail reasons and remaining resources.
            payload = event.get("payload", {})
            time_remaining = _extract_number(payload, ["time_remaining", "timeRemaining"])
            if time_remaining is not None:
                stats[stage_id]["time_remaining_on_fail"].append(time_remaining)

            fail_reason = payload.get("fail_reason") or payload.get("failReason")
            if fail_reason == "moves":
                stats[stage_id]["move_fail_count"] += 1

        if event["event_type"] in (
            EventType.STAGE_FAIL.value,
            EventType.STAGE_COMPLETE.value,
            EventType.QUIT.value,
        ):
            payload = event.get("payload", {})
            moves_used = _extract_number(payload, ["moves_used", "movesUsed", "moves"])
            if moves_used is not None:
                stats[stage_id]["moves_used"].append(moves_used)

    for (session_id, stage_id), stage_events in session_stage_events.items():
        # Sort events by timestamp to compute durations.
        stage_events = sorted(
            stage_events, key=lambda e: _parse_time(e.get("timestamp")) or datetime.min
        )
        last_start = None
        session_time_spent = None
        tokens_earned = 0.0
        tokens_spent = 0.0
        completed = False
        failed = False
        fail_reason = None
        fail_time_remaining = None
        fail_moves_remaining = None

        for event in stage_events:
            payload = event.get("payload", {})
            if event["event_type"] == EventType.RESOURCE_GAIN.value:
                amount = _extract_number(payload, ["amount", "tokens", "value", "delta"])
                if amount is not None:
                    tokens_earned += amount
            if event["event_type"] == EventType.RESOURCE_SPEND.value:
                amount = _extract_number(payload, ["amount", "tokens", "value", "delta"])
                if amount is not None:
                    tokens_spent += amount

            if event["event_type"] == EventType.STAGE_START.value:
                last_start = _parse_time(event.get("timestamp"))

            if event["event_type"] in (
                EventType.STAGE_COMPLETE.value,
                EventType.STAGE_FAIL.value,
                EventType.QUIT.value,
            ):
                end_time = _parse_time(event.get("timestamp"))
                if last_start and end_time:
                    time_spent = (end_time - last_start).total_seconds()
                    stats[stage_id]["time_spent"].append(time_spent)
                    session_time_spent = time_spent

                if event["event_type"] == EventType.STAGE_COMPLETE.value:
                    completed = True
                elif event["event_type"] == EventType.STAGE_FAIL.value:
                    failed = True
                    fail_reason = payload.get("fail_reason") or payload.get("failReason")
                    fail_time_remaining = _extract_number(payload, ["time_remaining", "timeRemaining"])
                    fail_moves_remaining = _extract_number(payload, ["moves_remaining", "movesRemaining"])
                last_start = None

        stats[stage_id]["tokens_earned"].append(tokens_earned)
        stats[stage_id]["tokens_spent"].append(tokens_spent)
        stats[stage_id]["session_records"].append(
            {
                "session_id": session_id,
                "time_spent": session_time_spent,
                "tokens_spent": tokens_spent,
                "completed": completed,
                "failed": failed,
                "fail_reason": fail_reason,
                "fail_time_remaining": fail_time_remaining,
                "fail_moves_remaining": fail_moves_remaining,
            }
        )

    return stats, {stage_id: stats[stage_id]["session_records"] for stage_id in stats}


# Build funnel metrics for a config.
def get_funnel_metrics(config_id: str, from_ts: Optional[str] = None, to_ts: Optional[str] = None):
    events = _load_events(config_id, from_ts, to_ts)
    stage_stats, _ = _build_stage_metrics(events)
    stages = []
    stage_ids = sorted(stage_stats.keys())

    for index, stage_id in enumerate(stage_ids):
        # Compute funnel counts for each stage.
        starts = stage_stats[stage_id]["stage_starts"]
        completes = stage_stats[stage_id]["stage_completes"]
        fails = stage_stats[stage_id]["stage_fails"]
        quits = stage_stats[stage_id]["stage_quits"]
        completion_rate = completes / starts if starts else 0.0
        failure_rate = fails / starts if starts else 0.0
        quit_rate = quits / starts if starts else 0.0

        next_starts = (
            stage_stats[stage_ids[index + 1]]["stage_starts"] if index + 1 < len(stage_ids) else None
        )
        dropoff = None
        if next_starts is not None and starts:
            dropoff = (starts - next_starts) / starts
        stages.append(
            {
                "stage_id": stage_id,
                "starts": starts,
                "completes": completes,
                "fails": fails,
                "quits": quits,
                "completion_rate": completion_rate,
                "failure_rate": failure_rate,
                "quit_rate": quit_rate,
                "dropoff_to_next": dropoff,
            }
        )
    return {"config_id": config_id, "stages": stages}


# Build detailed stage stats for a config.
def get_stage_stats(config_id: str, from_ts: Optional[str] = None, to_ts: Optional[str] = None):
    events = _load_events(config_id, from_ts, to_ts)
    stage_stats, _ = _build_stage_metrics(events)
    stage_ids = sorted(stage_stats.keys())

    stage_start_map = {stage_id: stage_stats[stage_id]["stage_starts"] for stage_id in stage_ids}
    stage_stats_output = []

    for index, stage_id in enumerate(stage_ids):
        stats = stage_stats[stage_id]
        stage_starts = stats["stage_starts"]
        stage_completes = stats["stage_completes"]
        stage_fails = stats["stage_fails"]
        stage_quits = stats["stage_quits"]
        retries = stats["retries"]

        completion_rate = stage_completes / stage_starts if stage_starts else 0.0
        failure_rate = stage_fails / stage_starts if stage_starts else 0.0
        quit_rate = stage_quits / stage_starts if stage_starts else 0.0
        retry_rate = retries / stage_starts if stage_starts else 0.0

        avg_time_spent = _mean(stats["time_spent"])
        median_time_remaining = _median(stats["time_remaining_on_fail"])
        avg_moves_used = _mean(stats["moves_used"])

        move_fail_ratio = (
            stats["move_fail_count"] / stage_fails if stage_fails else 0.0
        )
        avg_tokens_earned = _mean(stats["tokens_earned"])
        avg_tokens_spent = _mean(stats["tokens_spent"])
        token_pressure_index = (
            avg_tokens_spent / avg_tokens_earned
            if avg_tokens_earned and avg_tokens_earned > 0
            else None
        )
        helper_usage_rate = stats["powerup_used"] / stage_starts if stage_starts else 0.0

        next_starts = (
            stage_start_map.get(stage_ids[index + 1]) if index + 1 < len(stage_ids) else None
        )
        dropoff = None
        if next_starts is not None and stage_starts:
            dropoff = (stage_starts - next_starts) / stage_starts

        difficulty_conditions = [
            failure_rate > 0.40,
            median_time_remaining is not None and median_time_remaining < -3,
            retry_rate > 0.35,
            dropoff is not None and dropoff > 0.25,
        ]
        difficulty_spike = sum(1 for condition in difficulty_conditions if condition) >= 2

        flags = []
        if difficulty_spike:
            flags.append("difficulty_spike")

        stage_stats_output.append(
            {
                "stage_id": stage_id,
                "failure_rate": failure_rate,
                "quit_rate": quit_rate,
                "avg_time_spent_seconds": avg_time_spent,
                "median_time_remaining_on_fail": median_time_remaining,
                "avg_moves_used": avg_moves_used,
                "move_fail_ratio": move_fail_ratio,
                "retry_rate": retry_rate,
                "helper_usage_rate": helper_usage_rate,
                "token_pressure_index": token_pressure_index,
                "flags": flags,
                "completion_rate": completion_rate,
                "stage_starts": stage_starts,
                "stage_completes": stage_completes,
                "stage_fails": stage_fails,
                "stage_quits": stage_quits,
                "dropoff_to_next": dropoff,
                "avg_tokens_earned": avg_tokens_earned,
                "avg_tokens_spent": avg_tokens_spent,
            }
        )

    return {"config_id": config_id, "stats": stage_stats_output}


# Build progression curves for time and tokens.
def get_progression_metrics(config_id: str, from_ts: Optional[str] = None, to_ts: Optional[str] = None):
    stage_data = get_stage_stats(config_id, from_ts, to_ts)["stats"]
    progression = []
    for stage in stage_data:
        progression.append(
            {
                "stage_id": stage["stage_id"],
                "avg_time_spent_seconds": stage.get("avg_time_spent_seconds"),
                "avg_moves_used": stage.get("avg_moves_used"),
                "avg_tokens_earned": stage.get("avg_tokens_earned"),
                "avg_tokens_spent": stage.get("avg_tokens_spent"),
            }
        )
    return {"config_id": config_id, "stages": progression}


# Split records by top/bottom percentile of a key.
def _segment_records_by_percent(records: List[Dict[str, Any]], key: str, top: bool) -> List[Dict[str, Any]]:
    filtered = [record for record in records if record.get(key) is not None]
    if not filtered:
        return []
    filtered.sort(key=lambda r: r[key])
    cutoff = int(len(filtered) * 0.4)
    if cutoff == 0:
        return filtered
    return filtered[-cutoff:] if top else filtered[:cutoff]


# Compute completion rate for a segment.
def _segment_completion_rate(records: List[Dict[str, Any]]) -> float:
    if not records:
        return 0.0
    completed = sum(1 for record in records if record.get("completed"))
    return completed / len(records)


# Compute move-fail ratio for a segment.
def _segment_move_fail_ratio(records: List[Dict[str, Any]]) -> float:
    failures = [record for record in records if record.get("failed")]
    if not failures:
        return 0.0
    move_fails = sum(
        1 for record in failures if record.get("fail_reason") == "moves"
    )
    return move_fails / len(failures)


# Build fairness metrics between segments.
def get_fairness_metrics(
    segment: str, config_id: str, from_ts: Optional[str] = None, to_ts: Optional[str] = None
):
    events = _load_events(config_id, from_ts, to_ts)
    _, stage_records = _build_stage_metrics(events)
    stages = []

    for stage_id, records in stage_records.items():
        if segment in ("fast_vs_slow", "all"):
            fast = _segment_records_by_percent(records, "time_spent", top=False)
            slow = _segment_records_by_percent(records, "time_spent", top=True)
            fast_cr = _segment_completion_rate(fast)
            slow_cr = _segment_completion_rate(slow)
            fairness_gap = abs(fast_cr - slow_cr)
            fast_move = _segment_move_fail_ratio(fast)
            slow_move = _segment_move_fail_ratio(slow)
            skew = abs(fast_move - slow_move)
            flags = []
            if fairness_gap > 0.20:
                flags.append("fairness_violation")
            if skew > 0.30:
                flags.append("mechanical_bias")

            stages.append(
                {
                    "stage_id": stage_id,
                    "segment": "fast_vs_slow",
                    "completion_rate_fast": fast_cr,
                    "completion_rate_slow": slow_cr,
                    "fairness_gap": fairness_gap,
                    "move_fail_ratio_fast": fast_move,
                    "move_fail_ratio_slow": slow_move,
                    "flags": flags,
                }
            )

        if segment in ("high_vs_low", "all"):
            low = _segment_records_by_percent(records, "tokens_spent", top=False)
            high = _segment_records_by_percent(records, "tokens_spent", top=True)
            low_cr = _segment_completion_rate(low)
            high_cr = _segment_completion_rate(high)
            fairness_gap = abs(low_cr - high_cr)
            low_move = _segment_move_fail_ratio(low)
            high_move = _segment_move_fail_ratio(high)
            skew = abs(low_move - high_move)
            flags = []
            if fairness_gap > 0.20:
                flags.append("fairness_violation")
            if skew > 0.30:
                flags.append("mechanical_bias")

            stages.append(
                {
                    "stage_id": stage_id,
                    "segment": "high_vs_low",
                    "completion_rate_low": low_cr,
                    "completion_rate_high": high_cr,
                    "fairness_gap": fairness_gap,
                    "move_fail_ratio_low": low_move,
                    "move_fail_ratio_high": high_move,
                    "flags": flags,
                }
            )

    definition = {}
    if segment in ("fast_vs_slow", "all"):
        definition["fast"] = "bottom 40% time_spent"
        definition["slow"] = "top 40% time_spent"
    if segment in ("high_vs_low", "all"):
        definition["high"] = "top 40% tokens_spent"
        definition["low"] = "bottom 40% tokens_spent"

    return {
        "config_id": config_id,
        "segment": segment,
        "definition": definition,
        "stages": stages,
    }


# Compare metrics across configs.
def get_compare_metrics(config_ids, from_ts: Optional[str] = None, to_ts: Optional[str] = None):
    stage_map: Dict[int, Dict[str, Any]] = {}
    for config_id in config_ids:
        stage_stats = get_stage_stats(config_id, from_ts, to_ts)["stats"]
        for stage in stage_stats:
            stage_map.setdefault(stage["stage_id"], {"stage_id": stage["stage_id"], "by_config": {}})
            stage_map[stage["stage_id"]]["by_config"][config_id] = {
                "completion_rate": stage["completion_rate"],
                "failure_rate": stage["failure_rate"],
            }

    stages = [stage_map[key] for key in sorted(stage_map.keys())]
    return {"stages": stages}
