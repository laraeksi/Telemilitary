from logic.telemetry import validate_event


def test_missing_fields():
    result = validate_event({})
    assert result["is_valid"] is False
