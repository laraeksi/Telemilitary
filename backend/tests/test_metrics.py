from logic.metrics import get_funnel_metrics, _build_stage_metrics
from models import EventType


def test_funnel_metrics():
    result = get_funnel_metrics("balanced")
    assert result["config_id"] == "balanced"


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
