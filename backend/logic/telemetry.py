from datetime import datetime
from typing import Any, Dict, List

from models import EventType


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


def validate_event(event: Dict[str, Any]) -> Dict[str, Any]:
    anomalies: List[Dict[str, Any]] = []

    for field in REQUIRED_FIELDS:
        if event.get(field) is None:
            anomalies.append(
                {
                    "anomaly_id": f"missing_{field}",
                    "event_id": event.get("event_id", "unknown"),
                    "anomaly_type": "missing_field",
                    "detected_by": "required_field_check",
                    "resolution_status": "open",
                    "created_at": datetime.utcnow().isoformat(),
                    "details": {"field": field},
                }
            )

    event_type = event.get("event_type")
    if event_type not in [t.value for t in EventType]:
        anomalies.append(
            {
                "anomaly_id": "invalid_event_type",
                "event_id": event.get("event_id", "unknown"),
                "anomaly_type": "unknown",
                "detected_by": "event_type_check",
                "resolution_status": "open",
                "created_at": datetime.utcnow().isoformat(),
                "details": {"event_type": event_type},
            }
        )

    return {"is_valid": len(anomalies) == 0, "anomalies": anomalies}
