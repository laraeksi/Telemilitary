# Session start/end and summaries.
# Tracks high-level session lifecycle.
# routes/sessions.py
# Routes for starting/ending a game session and generating a session summary

from __future__ import annotations

import json
import uuid
from datetime import datetime

from flask import Blueprint, request

from data.db import get_connection
from models import ConfigId, EventType
from utils.errors import error_response

# Blueprint for session-related endpoints
bp = Blueprint("sessions", __name__)


# Identify or create a pseudonymous user id.
@bp.post("/api/player/identify")
def identify_player():
    # Creates/returns a pseudonymous user_id (frontend can provide one, or backend generates)
    body = request.get_json() or {}
    # Prefer client-provided id when present.
    user_id = body.get("client_user_id") or f"u_{uuid.uuid4().hex[:8]}"
    return {"user_id": user_id}


# Start a new session.
@bp.post("/api/sessions/start")
def start_session():
    # Starts a new session (one run through the 10 stages) for a user + chosen config (easy/balanced/hard)
    body = request.get_json() or {}
    # Pull required identifiers from payload.
    user_id = body.get("user_id")
    config_id = body.get("config_id")

    # Basic input validation
    if not user_id:
        return error_response("user_id is required", details={"field": "user_id"})
    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    session_id = str(uuid.uuid4())
    started_at = body.get("started_at") or datetime.utcnow().isoformat() + "Z"

    # Store the session start in the database
    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO sessions
            (session_id, user_id, config_id, start_time)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, user_id, config_id, started_at),
        )

    return {
        "session_id": session_id,
        "user_id": user_id,
        "config_id": config_id,
        "started_at": started_at,
    }, 201


# End an existing session.
@bp.post("/api/sessions/end")
def end_session():
    # Marks a session as finished (completed/quit/failed) and stores end time + outcome
    body = request.get_json() or {}
    # Required fields for update.
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


# Build a summary for a session.
@bp.get("/api/sessions/<session_id>/summary")
def session_summary(session_id: str):
    # Computes a per-stage and overall summary for a session using stored telemetry events
    # (used by the dashboard/debugging)
    with get_connection() as conn:
        session = conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        events = conn.execute(
            "SELECT * FROM events WHERE session_id = ? ORDER BY timestamp",
            (session_id,),
        ).fetchall()

    if session is None:
        return error_response("session not found", code="NOT_FOUND", status=404)

    per_stage: dict[int, dict] = {}
    total_retries = 0
    total_tokens_earned = 0
    total_tokens_spent = 0
    fails_by_reason = {"time": 0, "moves": 0}

    # Iterate through all events and aggregate useful stats per stage
    for row in events:
        stage_id = row["stage_id"]

        # Parse payload JSON stored in DB
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

        # Track stage start time (to compute time spent later)
        if row["event_type"] == EventType.STAGE_START.value:
            per_stage[stage_id]["start_time"] = row["timestamp"]

        # Track retry counts
        if row["event_type"] == EventType.RETRY.value:
            per_stage[stage_id]["retries"] += 1
            total_retries += 1

        # Track tokens earned/spent (resource events)
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

        # Stage end events determine outcome + allow time spent calculation
        if row["event_type"] in (
            EventType.STAGE_COMPLETE.value,
            EventType.STAGE_FAIL.value,
            EventType.QUIT.value,
        ):
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

            # Allow stage-end events to also carry token totals, if present
            if per_stage[stage_id]["tokens_earned"] == 0 and isinstance(payload.get("tokens_earned"), (int, float)):
                per_stage[stage_id]["tokens_earned"] = payload.get("tokens_earned")
                total_tokens_earned += payload.get("tokens_earned")

            if per_stage[stage_id]["tokens_spent"] == 0 and isinstance(payload.get("tokens_spent"), (int, float)):
                per_stage[stage_id]["tokens_spent"] = payload.get("tokens_spent")
                total_tokens_spent += payload.get("tokens_spent")

    # Count how many stages were completed
    stages_completed = len([s for s in per_stage.values() if s["outcome"] == "completed"])

    # Compute total session time if start and end times exist
    total_time_seconds = None
    if session["start_time"] and session["end_time"]:
        start_dt = datetime.fromisoformat(session["start_time"].replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(session["end_time"].replace("Z", "+00:00"))
        total_time_seconds = (end_dt - start_dt).total_seconds()

    # Return a dashboard-friendly summary object
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
