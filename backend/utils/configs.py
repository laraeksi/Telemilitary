# utils/configs.py
# Helper functions for reading game configuration data from the database

from __future__ import annotations

from data.db import get_connection


def fetch_configs() -> list:
    # Fetches all configs (easy / balanced / hard) with their stages, token rules and helpers.
    # Builds a nested structure suitable for frontend and dashboard use.

    with get_connection() as conn:
        config_rows = conn.execute("SELECT * FROM configs ORDER BY config_id").fetchall()
        stage_rows = conn.execute(
            "SELECT * FROM stages ORDER BY config_id, stage_id"
        ).fetchall()
        helper_rows = conn.execute("SELECT * FROM helpers").fetchall()
        token_rows = conn.execute("SELECT * FROM token_rules").fetchall()

    stages_by_config: dict[str, list] = {}
    helpers_by_stage: dict[tuple[str, int], dict] = {}
    tokens_by_stage: dict[tuple[str, int], dict] = {}

    # Group token rules by (config_id, stage_id)
    for token in token_rows:
        key = (token["config_id"], token["stage_id"])
        tokens_by_stage[key] = {
            "per_match": token["per_match"],
            "on_complete": token["on_complete"],
        }

    # Group helpers by (config_id, stage_id)
    for helper in helper_rows:
        key = (helper["config_id"], helper["stage_id"])
        helpers_by_stage.setdefault(key, {})
        helpers_by_stage[key][helper["helper_key"]] = {
            "cost": helper["cost"],
            **(
                {"effect_seconds": helper["effect_seconds"]}
                if helper["effect_seconds"] is not None
                else {}
            ),
        }

    # Group stages by config and attach helpers + token rules
    for stage in stage_rows:
        key = (stage["config_id"], stage["stage_id"])
        stages_by_config.setdefault(stage["config_id"], [])
        stages_by_config[stage["config_id"]].append(
            {
                "stage_id": stage["stage_id"],
                "rows": stage["grid_rows"],
                "cols": stage["grid_cols"],
                "card_count": stage["card_count"],
                "timer_seconds": stage["timer_seconds"],
                "move_limit": stage["move_limit"],
                "mismatch_penalty_seconds": stage["mismatch_penalty_seconds"],
                "token_rules": tokens_by_stage.get(key, {"per_match": 0, "on_complete": 0}),
                "helpers": helpers_by_stage.get(key, {}),
            }
        )

    # Assemble final config objects
    configs = []
    for config in config_rows:
        configs.append(
            {
                "config_id": config["config_id"],
                "label": config["label"],
                "start_tokens": config["start_tokens"],
                "stages": stages_by_config.get(config["config_id"], []),
            }
        )

    return configs


def get_config(config_id: str) -> dict | None:
    for config in fetch_configs():
        if config["config_id"] == config_id:
            return config
    return None


def get_config_ids() -> list[str]:
    with get_connection() as conn:
        rows = conn.execute("SELECT config_id FROM configs ORDER BY config_id").fetchall()
    return [row["config_id"] for row in rows]



def get_config(config_id: str) -> dict | None:
    # Returns a single config by ID (or None if not found)
    for config in fetch_configs():
        if config["config_id"] == config_id:
            return config
    return None


def get_config_ids() -> list[str]:
    # Returns a list of all available config IDs
    with get_connection() as conn:
        rows = conn.execute("SELECT config_id FROM configs ORDER BY config_id").fetchall()
    return [row["config_id"] for row in rows]
