# routes/balancing.py
from __future__ import annotations

from flask import Blueprint, request

from data.db import get_connection
from logic.balancing import get_suggestions, simulate_balance_change
from models import ConfigId
from utils.auth import require_designer
from utils.configs import get_config
from utils.errors import error_response

bp = Blueprint("balancing", __name__)


@bp.post("/api/balancing/suggestions")
def suggestions():
    auth_error = require_designer()
    if auth_error:
        return auth_error
    payload = request.get_json() or {}
    config_id = payload.get("config_id", "balanced")
    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})
    return get_suggestions(config_id)


@bp.post("/api/balancing/simulate")
def simulate():
    auth_error = require_designer()
    if auth_error:
        return auth_error
    payload = request.get_json() or {}
    config_id = payload.get("config_id", "balanced")
    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})
    return simulate_balance_change(payload)


@bp.get("/api/balancing/parameters")
def balancing_parameters():
    auth_error = require_designer()
    if auth_error:
        return auth_error

    config_id = request.args.get("config_id", "balanced")
    config = get_config(config_id)
    if not config:
        return error_response("config_id is invalid", details={"field": "config_id"})

    with get_connection() as conn:
        token_rows = conn.execute(
            "SELECT stage_id, per_match, on_complete FROM token_rules WHERE config_id = ?",
            (config_id,),
        ).fetchall()

    token_by_stage = {
        row["stage_id"]: {"per_match": row["per_match"], "on_complete": row["on_complete"]}
        for row in token_rows
    }

    editable = {
        "stages": [
            {
                "stage_id": stage["stage_id"],
                "timer_seconds": stage["timer_seconds"],
                "move_limit": stage["move_limit"],
                "mismatch_penalty_seconds": stage["mismatch_penalty_seconds"],
                "helpers": {
                    "peek_cost": stage["helpers"]["peek"]["cost"],
                    "freeze_cost": stage["helpers"]["freeze"]["cost"],
                    "shuffle_cost": stage["helpers"]["shuffle"]["cost"],
                },
                "token_rules": token_by_stage.get(stage["stage_id"], {"per_match": 1, "on_complete": 2}),
            }
            for stage in config["stages"]
        ]
    }

    return {"config_id": config_id, "editable": editable}
