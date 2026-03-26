"""
SQLite database helpers (connect + initialise + seed).

The backend uses a single SQLite file (`data/game.db`) to keep the project easy
to run and mark. This module is responsible for:
- opening connections with dict-like rows
- creating tables from `data/schema.sql`
- seeding a baseline set of configs/stages/helpers so the app works on first run
"""

# DB helpers for SQLite and seeding.
# Initializes schema and default configs.
import sqlite3

from config import Config



def get_connection():
    """Open a SQLite connection with `sqlite3.Row` (dict-like row access)."""
    conn = sqlite3.connect(Config.DB_PATH)
    # Allow dict-like row access.
    conn.row_factory = sqlite3.Row
    # Keep autocommit behavior via context manager.
    return conn


def _seed_configs(conn: sqlite3.Connection):
    """Seed baseline configs/stages/helpers/token rules if the DB is empty.

    We only seed when there are no configs yet, so we don't overwrite an existing
    database (e.g., a database that already has telemetry from a playtest).
    """
    existing = conn.execute("SELECT COUNT(*) as count FROM configs").fetchone()
    if existing and existing["count"] > 0:
        # Skip seeding if configs already exist.
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

        # Seed 10 stages per config (the game is designed around 10 stages).
        for stage_id in range(1, 11):
            card_count = 6 + stage_id * 2
            timer_seconds = timer_base - stage_id * 2
            move_limit = move_base + stage_id
            mismatch_penalty_seconds = 3

            # Derive a grid shape automatically from card count.
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
                ("undo", helper_base + 2, None),
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
    """Create schema and seed initial data if needed."""
    with get_connection() as conn:
        # Schema is stored in SQL so it's easy to read and edit.
        with open("data/schema.sql", "r", encoding="utf-8") as file:
            conn.executescript(file.read())
        # Seed baseline config/stage rows.
        _seed_configs(conn)
        # Seed some example telemetry so the dashboard has something to show.
        from data.seed_telemetry import seed_telemetry_if_empty
        seed_telemetry_if_empty(conn)
