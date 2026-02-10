from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime

from flask import Blueprint, request

from data.db import get_connection
from logic.telemetry import validate_event
from models import EventType
from utils.auth import require_designer
from utils.errors import error_response

bp = Blueprint("telemetry", __name__)


@bp.post("/api/events")
def ingest_event():
    body = request.get_json() or {}
    if not body.get("event_id"):
        body["event_id"] = str(uuid.uuid4())

    validation = validate_event(body)

    payload = body.get("payload") or {}
    if not isinstance(payload, dict):
        payload = {}

    event_type = body.get("event_type")
    if event_type in (EventType.STAGE_COMPLETE.value, EventType.STAGE_FAIL.value):
        with get_connection() as conn:
            start_row = conn.execute(
                """
                SELECT 1 FROM events
                WHERE session_id = ? AND stage_id = ? AND event_type = ?
                LIMIT 1
                """,
                (body.get("session_id"), body.get("stage_id"), EventType.STAGE_START.value),
            ).fetchone()

        if start_row is None:
            validation["anomalies"].append(
                {
                    "anomaly_id": f"{body['event_id']}_missing_stage_start",
                    "event_id": body["event_id"],
                    "anomaly_type": "invalid_sequence",
                    "detected_by": "temporal_logic_check",
                    "resolution_status": "open",
                    "created_at": datetime.utcnow().isoformat(),
                    "details": {"event_type": event_type},
                }
            )
            validation["is_valid"] = False

    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO events
            (event_id, session_id, user_id, timestamp, stage_id, config_id, event_type, payload, is_valid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.get("event_id"),
                body.get("session_id"),
                body.get("user_id"),
                body.get("timestamp"),
                body.get("stage_id"),
                body.get("config_id"),
                body.get("event_type"),
                json.dumps(payload),
                1 if validation["is_valid"] else 0,
            ),
        )

        for anomaly in validation["anomalies"]:
            conn.execute(
                """
                INSERT OR REPLACE INTO anomalies
                (anomaly_id, event_id, anomaly_type, detected_by, resolution_status, created_at, details)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    anomaly.get("anomaly_id"),
                    anomaly.get("event_id"),
                    anomaly.get("anomaly_type"),
                    anomaly.get("detected_by"),
                    anomaly.get("resolution_status"),
                    anomaly.get("created_at"),
                    json.dumps(anomaly.get("details") or {}),
                ),
            )

    response_anomalies = []
    for anomaly in validation["anomalies"]:
        detail = anomaly.get("details", {}).get("field") or anomaly.get("details")
        response_anomalies.append({"anomaly_type": anomaly.get("anomaly_type"), "detail": detail})

    return {"stored": True, "is_valid": validation["is_valid"], "anomalies": response_anomalies}, 201


@bp.get("/api/events")
def list_events():
    auth_error = require_designer()
    if auth_error:
        return auth_error

    filters = request.args.to_dict(flat=False)
    query = "SELECT * FROM events WHERE 1=1"
    params = []
    for key in ("config_id", "stage_id", "event_type", "session_id", "user_id"):
        values = request.args.getlist(key)
        if values:
            query += f" AND {key} IN ({','.join(['?'] * len(values))})"
            params.extend(values)

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()

    events = []
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
                "is_valid": bool(row["is_valid"]),
            }
        )

    return {"filters": filters, "events": events}


@bp.get("/api/export/events.csv")
def export_events():
    auth_error = require_designer()
    if auth_error:
        return auth_error

    config_id = request.args.get("config_id")
    query = "SELECT * FROM events WHERE 1=1"
    params = []
    if config_id:
        query += " AND config_id = ?"
        params.append(config_id)

    with get_connection() as conn:
        rows = conn.execute(f"{query} ORDER BY timestamp", params).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["event_id", "timestamp", "event_type", "user_id", "session_id", "stage_id", "config_id", "payload_json"])

    for row in rows:
        writer.writerow(
            [
                row["event_id"],
                row["timestamp"],
                row["event_type"],
                row["user_id"],
                row["session_id"],
                row["stage_id"],
                row["config_id"],
                row["payload"] or "{}",
            ]
        )

    return output.getvalue(), 200, {"Content-Type": "text/csv"}
