# Tests for role-based access control enforcement.
# Verifies that player cannot access designer/dashboard endpoints.
from app import create_app
from config import Config


def _make_client(tmp_path, monkeypatch):
    db_path = tmp_path / "test_rbac.db"
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))
    app = create_app()
    return app.test_client()


# Player should be blocked from dashboard metrics.
def test_player_cannot_access_metrics(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/metrics/funnel", headers={"X-Role": "player"})
    assert resp.status_code == 403


# Player should be blocked from listing events.
def test_player_cannot_list_events(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/events", headers={"X-Role": "player"})
    assert resp.status_code == 403


# Player should be blocked from CSV export.
def test_player_cannot_export_csv(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/export/events.csv", headers={"X-Role": "player"})
    assert resp.status_code == 403


# Viewer should be able to read metrics.
def test_viewer_can_access_metrics(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/metrics/funnel", headers={"X-Role": "viewer"})
    assert resp.status_code == 200


# Viewer should NOT be able to export CSV (designer-only).
def test_viewer_cannot_export_csv(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/export/events.csv", headers={"X-Role": "viewer"})
    assert resp.status_code == 403


# Viewer should NOT be able to create decisions (designer-only).
def test_viewer_cannot_create_decision(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.post("/api/decisions", json={
        "config_id": "balanced",
        "stage_id": 1,
        "rationale": "test",
    }, headers={"X-Role": "viewer"})
    assert resp.status_code == 403


# Designer should be able to create decisions.
def test_designer_can_create_decision(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.post("/api/decisions", json={
        "config_id": "balanced",
        "stage_id": 1,
        "change": {"timer_seconds": 35},
        "rationale": "Increase timer to reduce failure rate",
    }, headers={"X-Role": "designer"})
    assert resp.status_code == 201
    assert resp.get_json()["ok"] is True


# No role header should default to player and be blocked from dashboard.
def test_no_role_defaults_to_player(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/events")
    assert resp.status_code == 403


# Designer can access CSV export.
def test_designer_can_export_csv(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/export/events.csv", headers={"X-Role": "designer"})
    assert resp.status_code == 200
    assert "text/csv" in resp.content_type
