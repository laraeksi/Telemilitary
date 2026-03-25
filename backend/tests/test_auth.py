# Tests for designer authentication: register, login, password validation.
from app import create_app
from config import Config


def _make_client(tmp_path, monkeypatch):
    db_path = tmp_path / "test_auth.db"
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))
    app = create_app()
    return app.test_client()


# Registration with valid credentials should succeed.
def test_register_success(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.post("/api/auth/register", json={
        "username": "testdesigner",
        "password": "StrongPass1",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["ok"] is True
    assert data["user"]["username"] == "testdesigner"
    assert data["user"]["role"] == "designer"
    assert data["user"]["user_id"].startswith("u_")


# Registration with duplicate username should return 409.
def test_register_duplicate_username(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    client.post("/api/auth/register", json={
        "username": "dupeuser",
        "password": "StrongPass1",
    })
    resp = client.post("/api/auth/register", json={
        "username": "dupeuser",
        "password": "StrongPass2",
    })
    assert resp.status_code == 409


# Registration with weak password should be rejected.
def test_register_weak_password(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    # Too short
    resp = client.post("/api/auth/register", json={
        "username": "user1",
        "password": "Ab1",
    })
    assert resp.status_code == 400
    # No uppercase
    resp = client.post("/api/auth/register", json={
        "username": "user2",
        "password": "alllower1",
    })
    assert resp.status_code == 400
    # No digit
    resp = client.post("/api/auth/register", json={
        "username": "user3",
        "password": "NoDigitHere",
    })
    assert resp.status_code == 400


# Login with correct credentials should succeed.
def test_login_success(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    client.post("/api/auth/register", json={
        "username": "logintest",
        "password": "GoodPass1",
    })
    resp = client.post("/api/auth/login", json={
        "username": "logintest",
        "password": "GoodPass1",
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True
    assert data["user"]["username"] == "logintest"


# Login with wrong password should return 401.
def test_login_wrong_password(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    client.post("/api/auth/register", json={
        "username": "wrongpw",
        "password": "CorrectPass1",
    })
    resp = client.post("/api/auth/login", json={
        "username": "wrongpw",
        "password": "WrongPass1",
    })
    assert resp.status_code == 401


# Login with nonexistent username should return 401.
def test_login_nonexistent_user(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.post("/api/auth/login", json={
        "username": "ghost",
        "password": "Whatever1",
    })
    assert resp.status_code == 401
