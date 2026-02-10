from __future__ import annotations

from flask import Blueprint, request

from utils.auth import get_role

bp = Blueprint("auth", __name__)


@bp.get("/api/health")
def health():
    return {"ok": True}


@bp.post("/api/auth/login")
def login():
    # Fake login: decide role by username.
    body = request.get_json() or {}
    username = body.get("username", "")
    role = "designer" if username == "designer" else "player"
    return {"ok": True, "user": {"user_id": "u_admin_1", "role": role}}


@bp.post("/api/auth/logout")
def logout():
    return {"ok": True}


@bp.get("/api/me")
def me():
    role = get_role()
    user_id = request.headers.get("X-User-Id", "u_104")
    return {"is_authenticated": True, "user": {"user_id": user_id, "role": role}}
