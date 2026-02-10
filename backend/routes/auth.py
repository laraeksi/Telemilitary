# auth.py
# Routes related to user identity and roles (player vs designer).
# Authentication is simplified for this project.

from __future__ import annotations
from flask import Blueprint, request
from utils.auth import get_role

bp = Blueprint("auth", __name__)


@bp.get("/api/health")
def health():
    # Simple health check to confirm the backend is running
    return {"ok": True}


@bp.post("/api/auth/login")
def login():
    # Lightweight login: assigns a role based on username
    body = request.get_json() or {}
    username = body.get("username", "")
    role = "designer" if username == "designer" else "player"

    return {
        "ok": True,
        "user": {
            "user_id": "u_admin_1",  # pseudonymous ID
            "role": role,
        },
    }


@bp.post("/api/auth/logout")
def logout():
    # Frontend logout hook (no server-side state to clear)
    return {"ok": True}


@bp.get("/api/me")
def me():
    # Returns the current user's identity and role
    role = get_role()
    user_id = request.headers.get("X-User-Id", "u_104")

    return {
        "is_authenticated": True,
        "user": {
            "user_id": user_id,
            "role": role,
        },
    }
