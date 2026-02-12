import sqlite3

from config import Config


def get_connection():
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def pick_grid(target_cards: int):
    """
    Pick (rows, cols, cards) for a pairs memory game.
    - cards must be even
    - prefer cols 6, then 5, then 4 (nice layouts)
    - if target_cards doesn't factor nicely, bump up by 2 until it does
    """
    cards = target_cards
    # ensure even
    if cards % 2 != 0:
        cards += 1

    while True:
        for cols in (6, 5, 4):
            if cards % cols == 0:
                rows = cards // cols
                return rows, cols, cards
        cards += 2


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
            # Target difficulty scaling (cards increase by 2 each stage),
            # but we choose a grid that actually fits.
            target_cards = 6 + stage_id * 2  # 8, 10, 12, 14, ...
            grid_rows, grid_cols, card_count = pick_grid(target_cards)

            timer_seconds = timer_base - stage_id * 2
            move_limit = move_base + stage_id
            mismatch_penalty_seconds = 3

            # Safety: ensure invariant for pairs game
            # (won't trigger with pick_grid, but keeps data correct if changed later)
            if (grid_rows * grid_cols) != card_count:
                card_count = grid_rows * grid_cols
            if card_count % 2 != 0:
                card_count += 1

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
    with get_connection() as conn:
        with open("data/schema.sql", "r", encoding="utf-8") as file:
            conn.executescript(file.read())
        _seed_configs(conn)
        from data.seed_telemetry import seed_telemetry_if_empty

        seed_telemetry_if_empty(conn)
