# Tests for session lifecycle: start, end, summary.
from app import create_app
from config import Config


def _make_client(tmp_path, monkeypatch):
    db_path = tmp_path / "test_sessions.db"
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))
    app = create_app()
    return app.test_client()


# Starting a session should return session_id and 201.
def test_session_start(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.post("/api/sessions/start", json={
        "user_id": "u_test",
        "config_id": "balanced",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert "session_id" in data
    assert data["config_id"] == "balanced"


# Ending a session should return 200.
def test_session_end(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    # Start a session first
    start_resp = client.post("/api/sessions/start", json={
        "user_id": "u_test",
        "config_id": "easy",
    })
    session_id = start_resp.get_json()["session_id"]

    resp = client.post("/api/sessions/end", json={
        "session_id": session_id,
        "outcome": "completed",
    })
    assert resp.status_code == 200


# Session summary should return session data.
def test_session_summary(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    # Start and end a session
    start_resp = client.post("/api/sessions/start", json={
        "user_id": "u_test",
        "config_id": "hard",
    })
    session_id = start_resp.get_json()["session_id"]
    client.post("/api/sessions/end", json={
        "session_id": session_id,
        "outcome": "quit",
    })

    resp = client.get(f"/api/sessions/{session_id}/summary")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["session_id"] == session_id
