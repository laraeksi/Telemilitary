# utils/auth.py
# Small helpers for role-based access control (player vs designer)

from __future__ import annotations
from flask import request
from utils.errors import error_response


def get_role() -> str:
    # Reads the user's role from request headers
    # Defaults to "player" if no role is provided
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "", 1).strip()
    return request.headers.get("X-Role", "player")


def require_designer():
    # Blocks access to designer-only endpoints
    # Returns an error response if the caller is not a designer
    if get_role() != "designer":
        return error_response("designer role required", code="FORBIDDEN", status=403)
    return None
