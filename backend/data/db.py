import sqlite3

from config import Config



def get_connection():
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _seed_configs(conn: sqlite3.Connection):
    existing = conn.execute("SELECT COUNT(*) as count FROM configs").fetchone()
    if existing and existing["count"] > 0:
        return

    configs = [
        ("easy", "Easy", 75, 18, 2),
        ("balanced", "Balanced", 70, 16, 3),
        ("hard", "Hard", 65, 14, 4),
    ]

    for config_id, label, timer_base, move_base, helper_base in configs:
        conn.execute(
            "INSERT OR REPLACE INTO configs (config_id, label, start_tokens) VALUES (?, ?, ?)",
            (config_id, label, 5),
        )

        for stage_id in range(1, 11):
            card_count = 6 + stage_id * 2
            timer_seconds = timer_base - stage_id * 2
            move_limit = move_base + stage_id
            mismatch_penalty_seconds = 3

            # Derive grid shape automatically
            # Example: 8 cards -> 2x4, 12 cards -> 3x4, etc.
            grid_cols = 4
            grid_rows = card_count // grid_cols

            conn.execute(
                """
                INSERT OR REPLACE INTO stages
                (stage_id, config_id, grid_rows, grid_cols,
                card_count, timer_seconds, move_limit, mismatch_penalty_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    stage_id,
                    config_id,
                    grid_rows,
                    grid_cols,
                    card_count,
                    timer_seconds,
                    move_limit,
                    mismatch_penalty_seconds,
                ),
            )

            helpers = [
                ("peek", helper_base, 1),
                ("freeze", helper_base + 1, 3),
                ("shuffle", helper_base + 2, None),
            ]
            for helper_key, cost, effect_seconds in helpers:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO helpers
                    (stage_id, config_id, helper_key, cost, effect_seconds)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (stage_id, config_id, helper_key, cost, effect_seconds),
                )

            conn.execute(
                """
                INSERT OR REPLACE INTO token_rules
                (stage_id, config_id, per_match, on_complete)
                VALUES (?, ?, ?, ?)
                """,
                (stage_id, config_id, 1, 2),
            )


def init_db():
    with get_connection() as conn:
        with open("data/schema.sql", "r", encoding="utf-8") as file:
            conn.executescript(file.read())
        _seed_configs(conn)
        from data.seed_telemetry import seed_telemetry_if_empty
        seed_telemetry_if_empty(conn)
