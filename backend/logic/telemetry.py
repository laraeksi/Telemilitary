# Validates telemetry event shapes and values.
# Returns anomalies for invalid payloads.
from datetime import datetime
from typing import Any, Dict, List

from models import ConfigId, EventType


REQUIRED_FIELDS = [
    "event_id",
    "timestamp",
    "event_type",
    "user_id",
    "session_id",
    "stage_id",
    "config_id",
    "payload",
]


# Validate a telemetry event and return anomalies.
def validate_event(event: Dict[str, Any]) -> Dict[str, Any]:
    anomalies: List[Dict[str, Any]] = []
    event_id = event.get("event_id", "unknown")

    # Helper to append a structured anomaly record.
    def add_anomaly(anomaly_id: str, anomaly_type: str, detected_by: str, details: Dict[str, Any]):
        anomalies.append(
            {
                "anomaly_id": anomaly_id,
                "event_id": event_id,
                "anomaly_type": anomaly_type,
                "detected_by": detected_by,
                "resolution_status": "open",
                "created_at": datetime.utcnow().isoformat(),
                "details": details,
            }
        )

    # Check basic envelope fields first.
    for field in REQUIRED_FIELDS:
        if event.get(field) is None:
            add_anomaly(
                f"{event_id}_missing_{field}",
                "missing_field",
                "required_field_check",
                {"field": field},
            )

    # Ensure event_type is one of the known values.
    event_type = event.get("event_type")
    if event_type not in [t.value for t in EventType]:
        add_anomaly(
            f"{event_id}_invalid_event_type",
            "unknown",
            "event_type_check",
            {"event_type": event_type},
        )

    # Stage id must be between 1 and 10.
    stage_id = event.get("stage_id")
    if stage_id is None or not isinstance(stage_id, (int, float)) or not (1 <= int(stage_id) <= 10):
        add_anomaly(
            f"{event_id}_invalid_stage_id",
            "invalid_value",
            "stage_id_check",
            {"stage_id": stage_id},
        )

    # Config id must match the enum.
    config_id = event.get("config_id")
    if config_id not in [c.value for c in ConfigId]:
        add_anomaly(
            f"{event_id}_invalid_config_id",
            "invalid_value",
            "config_id_check",
            {"config_id": config_id},
        )

    # Payload must be a dict for field validation.
    payload = event.get("payload")
    if not isinstance(payload, dict):
        add_anomaly(
            f"{event_id}_invalid_payload",
            "invalid_payload",
            "payload_type_check",
            {"payload_type": type(payload).__name__},
        )
        return {"is_valid": len(anomalies) == 0, "anomalies": anomalies}

    # Payload requirements by event type.
    required_payload_fields = {
        EventType.SESSION_START.value: ["started_at"],
        EventType.SESSION_END.value: ["ended_at", "outcome"],
        EventType.STAGE_START.value: ["timer_seconds", "move_limit", "card_count", "token_start"],
        EventType.CARD_FLIP.value: ["card_index", "is_first_flip"],
        EventType.MATCH_SUCCESS.value: [
            "cards",
            "moves_used",
            "moves_remaining",
            "time_remaining",
            "tokens_after",
        ],
        EventType.MATCH_FAIL.value: [
            "cards",
            "penalty_seconds",
            "moves_used",
            "moves_remaining",
            "time_remaining",
            "tokens_after",
        ],
        EventType.RESOURCE_GAIN.value: ["amount", "reason"],
        EventType.RESOURCE_SPEND.value: ["amount", "powerup_type"],
        EventType.POWERUP_USED.value: ["powerup_type", "effect_duration_seconds"],
        EventType.STAGE_FAIL.value: [
            "fail_reason",
            "time_remaining",
            "moves_remaining",
            "tokens_earned",
            "tokens_spent",
        ],
        EventType.STAGE_COMPLETE.value: [
            "time_remaining",
            "moves_remaining",
            "total_moves_used",
            "tokens_earned",
            "tokens_spent",
        ],
        EventType.RETRY.value: ["reason"],
        EventType.QUIT.value: ["reason"],
        EventType.MOVE_USED.value: ["moves_used", "moves_remaining"],
        EventType.SETTINGS_CHANGE.value: ["setting_key", "setting_value"],
    }

    if event_type in required_payload_fields:
        for field in required_payload_fields[event_type]:
            if payload.get(field) is None:
                add_anomaly(
                    f"{event_id}_missing_payload_{field}",
                    "missing_field",
                    "payload_required_field_check",
                    {"field": field},
                )

    if event_type == EventType.STAGE_FAIL.value:
        fail_reason = payload.get("fail_reason")
        if fail_reason not in ("time", "moves"):
            add_anomaly(
                f"{event_id}_invalid_fail_reason",
                "invalid_value",
                "fail_reason_check",
                {"fail_reason": fail_reason},
            )

    return {"is_valid": len(anomalies) == 0, "anomalies": anomalies}
