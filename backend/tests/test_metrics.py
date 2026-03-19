# Tests for metrics helpers.
# Covers stage stats and funnel output.
from config import Config
from data.db import init_db
from logic.metrics import (
    get_funnel_metrics,
    _build_stage_metrics,
    _segment_records_by_percent,
    _segment_completion_rate,
    _segment_move_fail_ratio,
)
from models import EventType


# Basic funnel metrics sanity check.
def test_funnel_metrics(tmp_path, monkeypatch):
    # Point DB to a temporary file and initialize schema + seed data.
    db_path = tmp_path / "test_metrics.db"
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))
    init_db()

    result = get_funnel_metrics("balanced")
    # Basic sanity check for config id and presence of at least one stage.
    assert result["config_id"] == "balanced"
    assert isinstance(result.get("stages"), list)


# Stage metrics: completion + token accounting.
def test_build_stage_metrics_completion_and_tokens():
    # Create a short set of events, start a stage, gain 5 points, spend 2, complete stage
    events = [
        {
            "stage_id": 1,
            "session_id": "s1",
            "timestamp": "2024-01-01T00:00:00Z",
            "event_type": EventType.STAGE_START.value,
            "payload": {},
        },
        {
            "stage_id": 1,
            "session_id": "s1",
            "timestamp": "2024-01-01T00:03:00Z",
            "event_type": EventType.RESOURCE_GAIN.value,
            "payload": {"amount": 5},
        },
        {
            "stage_id": 1,
            "session_id": "s1",
            "timestamp": "2024-01-01T00:04:00Z",
            "event_type": EventType.RESOURCE_SPEND.value,
            "payload": {"amount": 2},
        },
        {
            "stage_id": 1,
            "session_id": "s1",
            "timestamp": "2024-01-01T00:05:00Z",
            "event_type": EventType.STAGE_COMPLETE.value,
            "payload": {"moves_used": 10},
        },
    ]
    
    # Build metrics from the mocked events list.
    stats, stage_records = _build_stage_metrics(events)

    assert 1 in stats
    s1 = stats[1]

    assert s1["stage_starts"] == 1
    assert s1["stage_completes"] == 1
    assert s1["stage_fails"] == 0
    assert s1["stage_quits"] == 0
    assert s1["retries"] == 0
    assert s1["powerup_used"] == 0

    # timing and aggregates
    assert len(s1["time_spent"]) == 1
    assert s1["time_spent"][0] == 300.0  # 5 minutes between start and complete
    assert s1["moves_used"] == [10.0]
    assert s1["tokens_earned"] == [5.0]
    assert s1["tokens_spent"] == [2.0]

    # session records mapping
    assert 1 in stage_records
    records = stage_records[1]
    assert len(records) == 1
    record = records[0]
    assert record["session_id"] == "s1"
    assert record["time_spent"] == 300.0
    assert record["tokens_spent"] == 2.0
    assert record["completed"] is True
    assert record["failed"] is False
    assert record["fail_reason"] is None


# Stage metrics: failure + move-fail handling.
def test_build_stage_metrics_failure_and_move_fail():
    events = [
        {
            "stage_id": 2,
            "session_id": "s2",
            "timestamp": "2024-01-01T01:00:00Z",
            "event_type": EventType.STAGE_START.value,
            "payload": {},
        },
        {
            "stage_id": 2,
            "session_id": "s2",
            "timestamp": "2024-01-01T01:02:00Z",
            "event_type": EventType.STAGE_FAIL.value,
            "payload": {
                "timeRemaining": -5,
                "failReason": "moves",
                "moves": 7,
            },
        },
        {
            "stage_id": 2,
            "session_id": "s2",
            "timestamp": "2024-01-01T01:03:00Z",
            "event_type": EventType.RETRY.value,
            "payload": {},
        },
        {
            "stage_id": 2,
            "session_id": "s2",
            "timestamp": "2024-01-01T01:04:00Z",
            "event_type": EventType.POWERUP_USED.value,
            "payload": {},
        },
    ]

    stats, stage_records = _build_stage_metrics(events)

    assert 2 in stats
    s2 = stats[2]

    assert s2["stage_starts"] == 1
    assert s2["stage_completes"] == 0
    assert s2["stage_fails"] == 1
    assert s2["stage_quits"] == 0
    assert s2["retries"] == 1
    assert s2["powerup_used"] == 1

    # time spent from start to fail
    assert len(s2["time_spent"]) == 1
    assert s2["time_spent"][0] == 120.0  # 2 minutes

    # fail-specific metrics
    assert s2["time_remaining_on_fail"] == [-5.0]
    assert s2["move_fail_count"] == 1
    assert s2["moves_used"] == [7.0]

    # session record reflects failure
    assert 2 in stage_records
    records = stage_records[2]
    assert len(records) == 1
    record = records[0]
    assert record["session_id"] == "s2"
    assert record["time_spent"] == 120.0
    assert record["failed"] is True
    assert record["fail_reason"] == "moves"


def test_segment_helpers_and_completion_rate():
    records = [
        {"time_spent": 10.0, "completed": True, "failed": False, "fail_reason": None},
        {"time_spent": 20.0, "completed": False, "failed": True, "fail_reason": "moves"},
        {"time_spent": 30.0, "completed": True, "failed": False, "fail_reason": None},
        {"time_spent": 40.0, "completed": False, "failed": True, "fail_reason": "time"},
        {"time_spent": 50.0, "completed": False, "failed": True, "fail_reason": "moves"},
    ]

    fast = _segment_records_by_percent(records, "time_spent", top=False)
    slow = _segment_records_by_percent(records, "time_spent", top=True)

    # With 5 records and 40% cut, each segment should have at least 2 entries.
    assert len(fast) >= 2
    assert len(slow) >= 2

    fast_cr = _segment_completion_rate(fast)
    slow_cr = _segment_completion_rate(slow)
    assert 0.0 <= fast_cr <= 1.0
    assert 0.0 <= slow_cr <= 1.0

    move_ratio = _segment_move_fail_ratio(records)
    assert 0.0 <= move_ratio <= 1.0
