import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data.db import _seed_configs
from data.seed_telemetry_legacy import seed_telemetry_if_empty

DB_PATH = ROOT / "data" / "game_legacy_compare.db"
SCHEMA_PATH = ROOT / "data" / "schema.sql"


def main():
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        _seed_configs(conn)
        seed_telemetry_if_empty(conn)
        conn.commit()
        counts = {
            "events": conn.execute("SELECT COUNT(*) FROM events").fetchone()[0],
            "sessions": conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0],
            "decisions": conn.execute("SELECT COUNT(*) FROM decisions").fetchone()[0],
            "anomalies": conn.execute("SELECT COUNT(*) FROM anomalies").fetchone()[0],
        }
        print(f"built {DB_PATH}")
        print(counts)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
