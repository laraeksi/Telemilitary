"""
Very small role-based access control helpers.

This project keeps auth intentionally lightweight: routes look at a role passed
in headers (either `Authorization: Bearer <role>` or `X-Role`) and decide if the
caller is allowed to use dashboard / designer endpoints.

It’s not meant to be "secure production auth" — it’s just enough for the
assignment’s separation of player vs designer vs viewer.
"""

from __future__ import annotations
from flask import request
from utils.errors import error_response

DASHBOARD_ROLES = ("designer", "viewer")


def get_role() -> str:
    """Extract the current caller role from request headers.

    Defaults to `"player"` so the game can work without special headers.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        # "Bearer designer" / "Bearer viewer" is the simplest thing to type in curl.
        return auth_header.replace("Bearer ", "", 1).strip()
    # Fallback header (handy if you don’t want to use the Authorization header).
    return request.headers.get("X-Role", "player")


def require_dashboard():
    """Block access unless role is `designer` or `viewer`."""
    role = get_role()
    if role not in DASHBOARD_ROLES:
        return error_response("designer or viewer role required", code="FORBIDDEN", status=403)
    return None


def require_designer():
    """Block access unless role is `designer` (used for write/admin style routes)."""
    if get_role() != "designer":
        return error_response("designer role required", code="FORBIDDEN", status=403)
    return None
