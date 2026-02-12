from app import create_app
from config import Config
from data.db import get_connection


def test_event_ingestion_stores_event(tmp_path, monkeypatch):
    db_path = tmp_path / "test_ingestion.db"
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))

    app = create_app()
    client = app.test_client()

    payload = {
        "event_id": "test_ev_001",
        "timestamp": "2026-02-12T12:00:00Z",
        "event_type": "stage_start",
        "user_id": "u_test",
        "session_id": "s_test",
        "stage_id": 1,
        "config_id": "balanced",
        "payload": {
            "timer_seconds": 30,
            "move_limit": 12,
            "card_count": 8,
            "token_start": 0,
        },
    }

    response = client.post("/api/events", json=payload)
    assert response.status_code == 201

    with get_connection() as conn:
        row = conn.execute(
            "SELECT event_id, is_valid FROM events WHERE event_id = ?",
            ("test_ev_001",),
        ).fetchone()

    assert row is not None
    assert row["is_valid"] == 1
