# utils/configs.py
# Helper functions for reading game configuration data from the database

from __future__ import annotations

from data.db import get_connection


def fetch_configs() -> list:
    # Fetches all configs (easy / balanced / hard) with their stages and helpers
    # Builds a nested structure suitable for frontend and dashboard use

    with get_connection() as conn:
        # Raw rows from the database
        config_rows = conn.execute("SELECT * FROM configs ORDER BY config_id").fetchall()
        stage_rows = conn.execute("SELECT * FROM stages ORDER BY stage_id").fetchall()
        helper_rows = conn.execute("SELECT * FROM helpers").fetchall()

    stages_by_config: dict[str, list] = {}
    helpers_by_stage: dict[tuple[str, int], dict] = {}

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

    # Group stages by config and attach helpers
    for stage in stage_rows:
        key = (stage["config_id"], stage["stage_id"])
        stages_by_config.setdefault(stage["config_id"], [])
        stages_by_config[stage["config_id"]].append(
            {
                "stage_id": stage["stage_id"],
                "card_count": stage["card_count"],
                "timer_seconds": stage["timer_seconds"],
                "move_limit": stage["move_limit"],
                "mismatch_penalty_seconds": stage["mismatch_penalty_seconds"],
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
                "stages": stages_by_config.get(config["config_id"], []),
            }
        )

    return configs


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
