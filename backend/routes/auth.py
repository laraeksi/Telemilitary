from __future__ import annotations
# Auth routes for registering and logging in designers.
# Handles register/login/logout helpers.

import uuid
from datetime import datetime
import re

from flask import Blueprint, request
from werkzeug.security import generate_password_hash, check_password_hash

from data.db import get_connection
from utils.auth import get_role
from utils.errors import error_response

bp = Blueprint("auth", __name__)


PASSWORD_RULES = [
    "At least 8 characters",
    "At least 1 uppercase letter",
    "At least 1 lowercase letter",
    "At least 1 number",
]


# Shared password validation helper.
def validate_password(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not re.search(r"[A-Z]", password):
        return "Password must include at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return "Password must include at least one lowercase letter."
    if not re.search(r"\d", password):
        return "Password must include at least one number."
    return None


# Simple health check endpoint.
@bp.get("/api/health")
def health():
    # Simple health check to confirm the backend is running
    # Useful for deployment checks.
    return {"ok": True}


# Register a new designer account.
@bp.post("/api/auth/register")
def register():
    # Creates a new user account (stored in SQLite)
    body = request.get_json() or {}
    # Trim username to avoid extra spaces.
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    if not username:
        return error_response("username is required", details={"field": "username"})
    if not password:
        return error_response("password is required", details={"field": "password"})
    password_error = validate_password(password)
    if password_error:
        return error_response(
            password_error,
            details={
                "field": "password",
                "rules": PASSWORD_RULES,
            },
        )

    # Generate a short user id prefix.
    user_id = f"u_{uuid.uuid4().hex[:8]}"
    created_at = datetime.utcnow().isoformat() + "Z"
    password_hash = generate_password_hash(password)

    try:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO designers (user_id, username, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, username, password_hash, created_at),
            )
    except Exception as e:
        # Most likely UNIQUE constraint failed on username
        return error_response("The chosen username already exists. Please use a different one.", code="CONFLICT", status=409)

    return {
        "ok": True,
        "user": {"user_id": user_id, "username": username, "role": "designer"},
    }, 201


# Login a designer account.
@bp.post("/api/auth/login")
def login():
    # Validates username/password and returns user_id + role
    body = request.get_json() or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    if not username:
        return error_response("username is required", details={"field": "username"})
    if not password:
        return error_response("password is required", details={"field": "password"})

    with get_connection() as conn:
        user = conn.execute(
            "SELECT user_id, username, password_hash FROM designers WHERE username = ?",
            (username,),
        ).fetchone()

    if user is None or not check_password_hash(user["password_hash"], password):
        return error_response("Invalid credentials. Please try again.", code="UNAUTHORIZED", status=401)

    return {
        "ok": True,
        "user": {"user_id": user["user_id"], "username": user["username"], "role": "designer"},
    }


# No-op logout endpoint for frontend.
@bp.post("/api/auth/logout")
def logout():
    # Frontend logout hook (no server-side session to clear)
    return {"ok": True}


# Return current user identity (best-effort).
@bp.get("/api/me")
def me():
    # Returns current user identity (best-effort):
    # - If X-User-Id header is provided, look up role from DB
    # - Otherwise fall back to header role logic (useful in dev)
    user_id = request.headers.get("X-User-Id")

    if user_id:
        with get_connection() as conn:
            user = conn.execute(
                "SELECT user_id, username FROM designers WHERE user_id = ?",
                (user_id,),
            ).fetchone()

        if user is not None:
            return {
            "is_authenticated": True,
            "user": {"user_id": user["user_id"], "username": user["username"], "role": "designer" }
        }
        else:
            generated_id = f"u_{uuid.uuid4().hex[:8]}"
            return {
                "is_authenticated": False,
            "user": {"user_id": generated_id, "username": None, "role": "player" }
            }
                

    # Fallback for development/testing
    role = get_role()
    return {"is_authenticated": True, "user": {"user_id": "u_104", "role": role}}
