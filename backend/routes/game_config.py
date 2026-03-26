"""
Game configuration routes (read + edit).

Configs represent difficulty presets (easy/balanced/hard) and include per-stage
parameters like timers, move limits, helper costs, and token reward rules.

The game frontend mainly uses the read endpoints, while the designer dashboard
uses the write endpoints to tune balance.
"""

from __future__ import annotations

from flask import Blueprint, request

from data.db import get_connection
from models import ConfigId
from utils.auth import require_designer
from utils.configs import fetch_configs, get_config
from utils.errors import error_response

# Blueprint for game configuration / parameter editing.
bp = Blueprint("game_config", __name__)


@bp.get("/api/game/configs")
def get_game_configs():
    """Return all configs (easy/balanced/hard) with stage parameters (public read)."""
    return {"configs": fetch_configs()}


@bp.get("/api/game/configs/<config_id>")
def get_single_config(config_id: str):
    """Return one config by id (used by the game to load parameters)."""
    config = get_config(config_id)
    if not config:
        return error_response("config not found", status=404)

    return {"config": config}



@bp.put("/api/game/configs/<config_id>/stages/<int:stage_id>")
def update_stage_config(config_id: str, stage_id: int):
    """Update parameters for a single stage (designer-only)."""
    auth_error = require_designer()
    if auth_error:
        return auth_error

    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})
    if not (1 <= stage_id <= 10):
        return error_response("stage_id is invalid", details={"field": "stage_id"})

    payload = request.get_json() or {}

    # Stage-level parameters (basic difficulty knobs).
    stage_fields = {
        "card_count": payload.get("card_count"),
        "timer_seconds": payload.get("timer_seconds"),
        "move_limit": payload.get("move_limit"),
        "mismatch_penalty_seconds": payload.get("mismatch_penalty_seconds"),
    }

    # Helper (power-up) costs (called helpers in the DB + API).
    helpers = payload.get("helpers") or {}

    # Token reward rules (how players earn tokens).
    token_rules = payload.get("token_rules") or {}

    with get_connection() as conn:
        # Ensure stage exists for this config (avoid silently creating wrong rows).
        existing = conn.execute(
            "SELECT 1 FROM stages WHERE config_id = ? AND stage_id = ?",
            (config_id, stage_id),
        ).fetchone()
        if existing is None:
            return error_response("stage not found", code="NOT_FOUND", status=404)

        # Update stage parameters (COALESCE keeps old values if not provided).
        conn.execute(
            """
            UPDATE stages
            SET card_count = COALESCE(?, card_count),
                timer_seconds = COALESCE(?, timer_seconds),
                move_limit = COALESCE(?, move_limit),
                mismatch_penalty_seconds = COALESCE(?, mismatch_penalty_seconds)
            WHERE config_id = ? AND stage_id = ?
            """,
            (
                stage_fields["card_count"],
                stage_fields["timer_seconds"],
                stage_fields["move_limit"],
                stage_fields["mismatch_penalty_seconds"],
                config_id,
                stage_id,
            ),
        )

        # Update helper costs if provided (we map API field names to DB keys).
        helper_map = {
            "peek_cost": "peek",
            "freeze_cost": "freeze",
            "shuffle_cost": "undo",
        }
        for key, helper_key in helper_map.items():
            if key in helpers and helpers[key] is not None:
                conn.execute(
                    """
                    UPDATE helpers SET cost = ?
                    WHERE config_id = ? AND stage_id = ? AND helper_key = ?
                    """,
                    (helpers[key], config_id, stage_id, helper_key),
                )

        # Update token rules if provided.
        if "per_match" in token_rules or "on_complete" in token_rules:
            conn.execute(
                """
                UPDATE token_rules
                SET per_match = COALESCE(?, per_match),
                    on_complete = COALESCE(?, on_complete)
                WHERE config_id = ? AND stage_id = ?
                """,
                (
                    token_rules.get("per_match"),
                    token_rules.get("on_complete"),
                    config_id,
                    stage_id,
                ),
            )

    # Return updated stage view so the dashboard can update without re-fetching everything.
    updated = get_config(config_id)
    return {
        "ok": True,
        "config_id": config_id,
        "stage_id": stage_id,
        "stage": next(
            (s for s in (updated or {}).get("stages", []) if s["stage_id"] == stage_id),
            None,
        ),
    }


@bp.put("/api/game/configs/<config_id>/stages")
def bulk_update_stages(config_id: str):
    """Bulk update multiple stages in one request (designer batch edits)."""
    auth_error = require_designer()
    if auth_error:
        return auth_error

    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    payload = request.get_json() or {}
    stages = payload.get("stages")
    if not isinstance(stages, list):
        return error_response("stages must be a list", details={"field": "stages"})

    updated_stage_ids: list[int] = []

    for stage_payload in stages:
        if not isinstance(stage_payload, dict):
            continue

        stage_id = stage_payload.get("stage_id")
        if not isinstance(stage_id, int) or not (1 <= stage_id <= 10):
            continue

        stage_fields = {
            "card_count": stage_payload.get("card_count"),
            "timer_seconds": stage_payload.get("timer_seconds"),
            "move_limit": stage_payload.get("move_limit"),
            "mismatch_penalty_seconds": stage_payload.get("mismatch_penalty_seconds"),
        }
        helpers = stage_payload.get("helpers") or {}
        token_rules = stage_payload.get("token_rules") or {}

        with get_connection() as conn:
            existing = conn.execute(
                "SELECT 1 FROM stages WHERE config_id = ? AND stage_id = ?",
                (config_id, stage_id),
            ).fetchone()
            if existing is None:
                continue

            conn.execute(
                """
                UPDATE stages
                SET card_count = COALESCE(?, card_count),
                    timer_seconds = COALESCE(?, timer_seconds),
                    move_limit = COALESCE(?, move_limit),
                    mismatch_penalty_seconds = COALESCE(?, mismatch_penalty_seconds)
                WHERE config_id = ? AND stage_id = ?
                """,
                (
                    stage_fields["card_count"],
                    stage_fields["timer_seconds"],
                    stage_fields["move_limit"],
                    stage_fields["mismatch_penalty_seconds"],
                    config_id,
                    stage_id,
                ),
            )

            helper_map = {
                "peek_cost": "peek",
                "freeze_cost": "freeze",
                "shuffle_cost": "undo",
            }
            for key, helper_key in helper_map.items():
                if key in helpers and helpers[key] is not None:
                    conn.execute(
                        """
                        UPDATE helpers SET cost = ?
                        WHERE config_id = ? AND stage_id = ? AND helper_key = ?
                        """,
                        (helpers[key], config_id, stage_id, helper_key),
                    )

            if "per_match" in token_rules or "on_complete" in token_rules:
                conn.execute(
                    """
                    UPDATE token_rules
                    SET per_match = COALESCE(?, per_match),
                        on_complete = COALESCE(?, on_complete)
                    WHERE config_id = ? AND stage_id = ?
                    """,
                    (
                        token_rules.get("per_match"),
                        token_rules.get("on_complete"),
                        config_id,
                        stage_id,
                    ),
                )

        updated_stage_ids.append(stage_id)

    updated_config = get_config(config_id)
    updated_stages = []
    if updated_config:
        stage_map = {s["stage_id"]: s for s in updated_config.get("stages", [])}
        updated_stages = [stage_map[sid] for sid in updated_stage_ids if sid in stage_map]

    return {
        "ok": True,
        "config_id": config_id,
        "updated_stages": updated_stages,
    }


@bp.patch("/api/game/configs/<config_id>/apply")
def apply_config_deltas(config_id: str):
    """Apply the same parameter delta across all stages in a config (designer-only)."""
    auth_error = require_designer()
    if auth_error:
        return auth_error

    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    payload = request.get_json() or {}
    timer_delta = payload.get("timer_seconds_delta")
    move_delta = payload.get("move_limit_delta")
    mismatch_delta = payload.get("mismatch_penalty_seconds_delta")
    helper_delta = payload.get("helper_cost_delta")
    token_rules = payload.get("token_rules_delta") or {}

    with get_connection() as conn:
        if timer_delta is not None:
            conn.execute(
                "UPDATE stages SET timer_seconds = timer_seconds + ? WHERE config_id = ?",
                (timer_delta, config_id),
            )
        if move_delta is not None:
            conn.execute(
                "UPDATE stages SET move_limit = move_limit + ? WHERE config_id = ?",
                (move_delta, config_id),
            )
        if mismatch_delta is not None:
            conn.execute(
                "UPDATE stages SET mismatch_penalty_seconds = mismatch_penalty_seconds + ? WHERE config_id = ?",
                (mismatch_delta, config_id),
            )
        if helper_delta is not None:
            conn.execute(
                "UPDATE helpers SET cost = cost + ? WHERE config_id = ?",
                (helper_delta, config_id),
            )
        if "per_match" in token_rules or "on_complete" in token_rules:
            conn.execute(
                """
                UPDATE token_rules
                SET per_match = per_match + COALESCE(?, 0),
                    on_complete = on_complete + COALESCE(?, 0)
                WHERE config_id = ?
                """,
                (
                    token_rules.get("per_match"),
                    token_rules.get("on_complete"),
                    config_id,
                ),
            )

    return {"ok": True, "config_id": config_id}
