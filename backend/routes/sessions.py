from __future__ import annotations

import json
import uuid
from datetime import datetime

from flask import Blueprint, request

from data.db import get_connection
from models import ConfigId, EventType
from utils.errors import error_response

bp = Blueprint("sessions", __name__)


@bp.post("/api/player/identify")
def identify_player():
    body = request.get_json() or {}
    user_id = body.get("client_user_id") or f"u_{uuid.uuid4().hex[:8]}"
    return {"user_id": user_id}


@bp.post("/api/sessions/start")
def start_session():
    body = request.get_json() or {}
    user_id = body.get("user_id")
    config_id = body.get("config_id")

    if not user_id:
        return error_response("user_id is required", details={"field": "user_id"})
    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    session_id = str(uuid.uuid4())
    started_at = body.get("started_at") or datetime.utcnow().isoformat() + "Z"

    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO sessions
            (session_id, user_id, config_id, start_time)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, user_id, config_id, started_at),
        )

    return {"session_id": session_id, "user_id": user_id, "config_id": config_id, "started_at": started_at}, 201


@bp.post("/api/sessions/end")
def end_session():
    body = request.get_json() or {}
    session_id = body.get("session_id")
    outcome = body.get("outcome")
    ended_at = body.get("ended_at") or datetime.utcnow().isoformat() + "Z"

    if not session_id:
        return error_response("session_id is required", details={"field": "session_id"})
    if outcome not in ("completed", "quit", "failed"):
        return error_response("outcome is invalid", details={"field": "outcome"})

    with get_connection() as conn:
        conn.execute(
            """
            UPDATE sessions
            SET end_time = ?, outcome = ?
            WHERE session_id = ?
            """,
            (ended_at, outcome, session_id),
        )
    return {"ok": True}


@bp.get("/api/sessions/<session_id>/summary")
def session_summary(session_id: str):
    with get_connection() as conn:
        session = conn.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        events = conn.execute("SELECT * FROM events WHERE session_id = ? ORDER BY timestamp", (session_id,)).fetchall()

    if session is None:
        return error_response("session not found", code="NOT_FOUND", status=404)

    per_stage: dict[int, dict] = {}
    total_retries = 0
    total_tokens_earned = 0
    total_tokens_spent = 0
    fails_by_reason = {"time": 0, "moves": 0}

    for row in events:
        stage_id = row["stage_id"]
        payload = {}
        if row["payload"]:
            try:
                payload = json.loads(row["payload"])
            except json.JSONDecodeError:
                payload = {}

        if stage_id is None:
            continue

        stage_id = int(stage_id)
        per_stage.setdefault(
            stage_id,
            {
                "stage_id": stage_id,
                "outcome": None,
                "fail_reason": None,
                "time_spent_seconds": None,
                "retries": 0,
                "tokens_earned": 0,
                "tokens_spent": 0,
                "start_time": None,
            },
        )

        if row["event_type"] == EventType.STAGE_START.value:
            per_stage[stage_id]["start_time"] = row["timestamp"]

        if row["event_type"] == EventType.RETRY.value:
            per_stage[stage_id]["retries"] += 1
            total_retries += 1

        if row["event_type"] == EventType.RESOURCE_GAIN.value:
            amount = payload.get("amount")
            if isinstance(amount, (int, float)):
                per_stage[stage_id]["tokens_earned"] += amount
                total_tokens_earned += amount

        if row["event_type"] == EventType.RESOURCE_SPEND.value:
            amount = payload.get("amount")
            if isinstance(amount, (int, float)):
                per_stage[stage_id]["tokens_spent"] += amount
                total_tokens_spent += amount

        if row["event_type"] in (EventType.STAGE_COMPLETE.value, EventType.STAGE_FAIL.value, EventType.QUIT.value):
            start_time = per_stage[stage_id]["start_time"]
            if start_time:
                start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))
                per_stage[stage_id]["time_spent_seconds"] = (end_dt - start_dt).total_seconds()

            if row["event_type"] == EventType.STAGE_COMPLETE.value:
                per_stage[stage_id]["outcome"] = "completed"
            elif row["event_type"] == EventType.STAGE_FAIL.value:
                per_stage[stage_id]["outcome"] = "failed"
                fail_reason = payload.get("fail_reason")
                per_stage[stage_id]["fail_reason"] = fail_reason
                if fail_reason in fails_by_reason:
                    fails_by_reason[fail_reason] += 1
            elif row["event_type"] == EventType.QUIT.value:
                per_stage[stage_id]["outcome"] = "quit"

            if per_stage[stage_id]["tokens_earned"] == 0 and isinstance(payload.get("tokens_earned"), (int, float)):
                per_stage[stage_id]["tokens_earned"] = payload.get("tokens_earned")
                total_tokens_earned += payload.get("tokens_earned")

            if per_stage[stage_id]["tokens_spent"] == 0 and isinstance(payload.get("tokens_spent"), (int, float)):
                per_stage[stage_id]["tokens_spent"] = payload.get("tokens_spent")
                total_tokens_spent += payload.get("tokens_spent")

    stages_completed = len([s for s in per_stage.values() if s["outcome"] == "completed"])

    total_time_seconds = None
    if session["start_time"] and session["end_time"]:
        start_dt = datetime.fromisoformat(session["start_time"].replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(session["end_time"].replace("Z", "+00:00"))
        total_time_seconds = (end_dt - start_dt).total_seconds()

    return {
        "session_id": session_id,
        "config_id": session["config_id"],
        "stages_completed": stages_completed,
        "total_time_seconds": total_time_seconds,
        "total_retries": total_retries,
        "total_tokens_earned": total_tokens_earned,
        "total_tokens_spent": total_tokens_spent,
        "fails_by_reason": fails_by_reason,
        "per_stage": [
            {
                "stage_id": s["stage_id"],
                "outcome": s["outcome"],
                "fail_reason": s["fail_reason"],
                "time_spent_seconds": s["time_spent_seconds"],
                "retries": s["retries"],
                "tokens_earned": s["tokens_earned"],
                "tokens_spent": s["tokens_spent"],
            }
            for s in sorted(per_stage.values(), key=lambda item: item["stage_id"])
        ],
    }
