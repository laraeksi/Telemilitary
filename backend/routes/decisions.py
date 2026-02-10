# routes/decisions.py
from __future__ import annotations

import json
import uuid
from datetime import datetime

from flask import Blueprint, request

from data.db import get_connection
from utils.auth import require_designer

bp = Blueprint("decisions", __name__)


@bp.get("/api/decisions")
def list_decisions():
    auth_error = require_designer()
    if auth_error:
        return auth_error

    config_id = request.args.get("config_id")
    query = "SELECT * FROM decisions"
    params = []
    if config_id:
        query += " WHERE config_id = ?"
        params.append(config_id)

    with get_connection() as conn:
        rows = conn.execute(f"{query} ORDER BY timestamp DESC", params).fetchall()

    decisions = []
    for row in rows:
        change = {}
        evidence = []
        if row["change_json"]:
            try:
                change = json.loads(row["change_json"])
            except json.JSONDecodeError:
                change = {}
        if row["evidence_links"]:
            try:
                evidence = json.loads(row["evidence_links"])
            except json.JSONDecodeError:
                evidence = []

        decisions.append(
            {
                "decision_id": row["decision_id"],
                "config_id": row["config_id"],
                "stage_id": row["stage_id"],
                "change": change,
                "rationale": row["rationale"],
                "evidence_links": evidence,
                "created_at": row["timestamp"],
            }
        )

    return {"decisions": decisions}


@bp.post("/api/decisions")
def create_decision():
    auth_error = require_designer()
    if auth_error:
        return auth_error

    payload = request.get_json() or {}
    decision_id = payload.get("decision_id") or str(uuid.uuid4())
    created_at = payload.get("created_at") or datetime.utcnow().isoformat() + "Z"

    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO decisions
            (decision_id, config_id, stage_id, change_json, rationale, evidence_links, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                decision_id,
                payload.get("config_id"),
                payload.get("stage_id"),
                json.dumps(payload.get("change") or {}),
                payload.get("rationale"),
                json.dumps(payload.get("evidence_links") or []),
                created_at,
            ),
        )

    return {"decision_id": decision_id, "ok": True}, 201
