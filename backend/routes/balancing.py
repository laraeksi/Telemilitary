# Designer-only balancing endpoints.
# Provides suggestions and simulations.
# routes/balancing.py
# Routes used by designers to analyse and adjust game balance

from __future__ import annotations

from flask import Blueprint, request

from data.db import get_connection
from logic.balancing import get_suggestions, simulate_balance_change
from models import ConfigId
from utils.auth import require_dashboard
from utils.configs import get_config
from utils.errors import error_response


def _helper_costs_for_editor(stage: dict) -> dict:
    """Peek / freeze / undo costs for the dashboard. DB uses helper_key 'undo'; API field name remains shuffle_cost."""
    h = stage.get("helpers") or {}

    def cost(*keys: str) -> int:
        for k in keys:
            entry = h.get(k)
            if isinstance(entry, dict) and entry.get("cost") is not None:
                return int(entry["cost"])
        return 0

    return {
        "peek_cost": cost("peek"),
        "freeze_cost": cost("freeze"),
        "shuffle_cost": cost("shuffle", "undo"),
    }


# Blueprint for balancing and tuning endpoints (designer-only)
bp = Blueprint("balancing", __name__)


# Return balancing suggestions for a config.
@bp.post("/api/balancing/suggestions")
def suggestions():
    # Returns rule-based balancing suggestions for a given config
    # Uses aggregated telemetry data (fail rates, time, etc.)
    # Designer role required for access.
    auth_error = require_dashboard()
    if auth_error:
        return auth_error

    payload = request.get_json() or {}
    config_id = payload.get("config_id", "balanced")

    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    return get_suggestions(config_id)


# Simulate balance changes for a config.
@bp.post("/api/balancing/simulate")
def simulate():
    # Runs a lightweight simulation to estimate the impact of parameter changes
    # Does not modify stored configs
    # This is read-only.
    auth_error = require_dashboard()
    if auth_error:
        return auth_error

    payload = request.get_json() or {}
    config_id = payload.get("config_id", "balanced")

    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    return simulate_balance_change(payload)


# Return editable balancing parameters.
@bp.get("/api/balancing/parameters")
def balancing_parameters():
    # Returns all editable balancing parameters for a config
    # Used to populate the designer parameter editor UI
    # Designer-only access.
    auth_error = require_dashboard()
    if auth_error:
        return auth_error

    config_id = request.args.get("config_id", "balanced")
    config = get_config(config_id)

    if not config:
        return error_response("config_id is invalid", details={"field": "config_id"})

    # Fetch token reward rules per stage
    with get_connection() as conn:
        token_rows = conn.execute(
            "SELECT stage_id, per_match, on_complete FROM token_rules WHERE config_id = ?",
            (config_id,),
        ).fetchall()

    token_by_stage = {
        row["stage_id"]: {
            "per_match": row["per_match"],
            "on_complete": row["on_complete"],
        }
        for row in token_rows
    }

    # Build a simplified, editable view of stage parameters
    editable = {
        "stages": [
            {
                "stage_id": stage["stage_id"],
                "card_count": stage.get("card_count"),
                "timer_seconds": stage["timer_seconds"],
                "move_limit": stage["move_limit"],
                "mismatch_penalty_seconds": stage["mismatch_penalty_seconds"],
                "helpers": _helper_costs_for_editor(stage),
                "token_rules": token_by_stage.get(
                    stage["stage_id"],
                    {"per_match": 1, "on_complete": 2},
                ),
            }
            for stage in config["stages"]
        ]
    }

    return {"config_id": config_id, "editable": editable}
