# utils/configs.py
from __future__ import annotations

from data.db import get_connection


def fetch_configs() -> list:
    # Open a DB connection and pull raw rows.
    with get_connection() as conn:
        config_rows = conn.execute("SELECT * FROM configs ORDER BY config_id").fetchall()
        stage_rows = conn.execute("SELECT * FROM stages ORDER BY stage_id").fetchall()
        helper_rows = conn.execute("SELECT * FROM helpers").fetchall()

    stages_by_config: dict[str, list] = {}
    helpers_by_stage: dict[tuple[str, int], dict] = {}

    for helper in helper_rows:
        key = (helper["config_id"], helper["stage_id"])
        helpers_by_stage.setdefault(key, {})
        helpers_by_stage[key][helper["helper_key"]] = {
            "cost": helper["cost"],
            **({"effect_seconds": helper["effect_seconds"]} if helper["effect_seconds"] is not None else {}),
        }

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
    for config in fetch_configs():
        if config["config_id"] == config_id:
            return config
    return None


def get_config_ids() -> list[str]:
    with get_connection() as conn:
        rows = conn.execute("SELECT config_id FROM configs ORDER BY config_id").fetchall()
    return [row["config_id"] for row in rows]
