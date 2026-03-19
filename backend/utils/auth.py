# Role-based access checks for requests.
# Three user types: player, designer, viewer (spec).
# utils/auth.py

from __future__ import annotations
from flask import request
from utils.errors import error_response

DASHBOARD_ROLES = ("designer", "viewer")


# Read role from request headers.
def get_role() -> str:
    # Reads the user's role from request headers
    # Defaults to "player" if no role is provided
    # Supports simple Bearer role tokens.
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "", 1).strip()
    return request.headers.get("X-Role", "player")


# Allow designer or viewer (read-only dashboard: metrics, events list, etc.).
def require_dashboard():
    role = get_role()
    if role not in DASHBOARD_ROLES:
        return error_response("designer or viewer role required", code="FORBIDDEN", status=403)
    return None


# Enforce designer-only access (write operations: config edits, decisions, balancing).
def require_designer():
    if get_role() != "designer":
        return error_response("designer role required", code="FORBIDDEN", status=403)
    return None
