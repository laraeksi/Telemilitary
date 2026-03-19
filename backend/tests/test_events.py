# Tests for telemetry validation rules.
# Focuses on missing/invalid fields.
from logic.telemetry import validate_event
from models import ConfigId

# Build a minimal valid stage_start event.
def make_valid_stage_start():
    """
    Helper to build a minimal valid event.
    We then remove individual fields to test missing-field handling.
    """
    return {
        "event_id": "e1",
        "timestamp": "2025-01-01T00:00:00Z",
        "event_type": "stage_start",
        "user_id": "u1",
        "session_id": "s1",
        "stage_id": 1,
        "config_id": "balanced",
        "payload": {
            "timer_seconds": 60,
            "move_limit": 20,
            "card_count": 16,
            "token_start": 0,
        },
    }

# Build an invalid stage_fail event.
def make_invalid_stage_fail():
    """
    Build a stage_fail event with an incorrect fail reason
    """
    return {
        "event_id": "e2",
        "timestamp": "2025-01-01T00:00:00Z",
        "event_type": "stage_fail",
        "user_id": "u1",
        "session_id": "s1",
        "stage_id": 1,
        "config_id": "balanced",
        "payload": {
            "fail_reason": "fake",
            "time_remaining": -5,
            "moves_remaining": 0,
            "tokens_earned": 0,
            "tokens_spent": 0,
        },
    }


# Empty event should be invalid.
def test_missing_all_fields_marks_invalid():
    """Completely empty event should be marked invalid."""
    # Empty payload should fail required field checks.
    result = validate_event({})
    assert result["is_valid"] is False


# Missing required field should be flagged.
def test_missing_required_top_level_field():
    """
    Verify that when a single required top-level field is missing
    (e.g. 'user_id'), validate_event marks the event invalid and
    records a 'missing_field' anomaly for that field.
    """
    event = make_valid_stage_start()
    event.pop("user_id")

    result = validate_event(event)

    assert result["is_valid"] is False

    missing_field_anomalies = [
        a for a in result["anomalies"] if a["anomaly_type"] == "missing_field"
    ]
    assert any(a["details"].get("field") == "user_id" for a in missing_field_anomalies)

# Incorrect fail reason should be flagged.
def test_incorrect_fail_reason():
    """
    Verify that when a the fail reason is NOT one of the accepted reasons
    (e.g. 'time'), validate_event makes the event invalid and records
    a "fail_reason_check" anomaly for that field.
    """
    event = make_invalid_stage_fail()
    result = validate_event(event)

    # Event should be marked invalid because fail_reason is not "time" or "moves"
    assert result["is_valid"] is False

    anomalies = result["anomalies"]
    # There should be an anomaly specifically about the invalid fail_reason
    invalid_fail_reason_anomalies = [
        a
        for a in anomalies
        if a["anomaly_type"] == "invalid_value"
        and a["detected_by"] == "fail_reason_check"
    ]
    assert any(
        a["details"].get("fail_reason") == "fake"
        for a in invalid_fail_reason_anomalies
    )


# Unknown event type should be flagged.
def test_invalid_event_type_is_flagged():
    event = make_valid_stage_start()
    # Force an invalid event type.
    event["event_type"] = "made_up_event"
    result = validate_event(event)
    assert result["is_valid"] is False
    assert any(
        a["anomaly_type"] == "unknown" and a["detected_by"] == "event_type_check"
        for a in result["anomalies"]
    )


# Missing payload fields should be flagged.
def test_missing_payload_fields_for_stage_start():
    event = make_valid_stage_start()
    event["payload"].pop("timer_seconds")
    result = validate_event(event)
    assert result["is_valid"] is False
    assert any(
        a["anomaly_type"] == "missing_field"
        and a["detected_by"] == "payload_required_field_check"
        and a["details"].get("field") == "timer_seconds"
        for a in result["anomalies"]
    )


# Non-dict payloads should be flagged as invalid_payload.
def test_payload_not_dict_marks_invalid():
    event = make_valid_stage_start()
    event["payload"] = "not-a-dict"
    result = validate_event(event)
    assert result["is_valid"] is False
    assert any(
        a["anomaly_type"] == "invalid_payload"
        and a["detected_by"] == "payload_type_check"
        for a in result["anomalies"]
    )


# Stage id outside allowed range should be treated as invalid_value.
def test_stage_id_out_of_range_marks_invalid():
    event = make_valid_stage_start()
    event["stage_id"] = 99
    result = validate_event(event)
    assert result["is_valid"] is False
    assert any(
        a["anomaly_type"] == "invalid_value"
        and a["detected_by"] == "stage_id_check"
        for a in result["anomalies"]
    )


# Config id outside enum should be treated as invalid_value.
def test_invalid_config_id_marks_invalid():
    event = make_valid_stage_start()
    # Ensure we are not accidentally using a valid enum value.
    assert "invalid_config" not in [c.value for c in ConfigId]
    event["config_id"] = "invalid_config"
    result = validate_event(event)
    assert result["is_valid"] is False
    assert any(
        a["anomaly_type"] == "invalid_value"
        and a["detected_by"] == "config_id_check"
        for a in result["anomalies"]
    )
    