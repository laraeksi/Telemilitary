# utils/auth.py
from __future__ import annotations

from flask import request

from utils.errors import error_response


def get_role() -> str:
    """Read role from headers. Defaults to 'player'."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "", 1).strip()
    return request.headers.get("X-Role", "player")


def require_designer():
    """Return an error response if caller is not designer, else None."""
    if get_role() != "designer":
        return error_response("designer role required", code="FORBIDDEN", status=403)
    return None
