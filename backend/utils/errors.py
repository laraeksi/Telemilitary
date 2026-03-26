"""
Shared error response helper.

Most routes return JSON. To keep the frontend and tests simple, we return errors
in one consistent shape everywhere (same top-level keys, same `code` field, etc).
"""

from __future__ import annotations
from typing import Any
from flask import jsonify


def error_response(
    message: str,
    *,
    code: str = "VALIDATION_ERROR",
    details: dict | None = None,
    status: int = 400,
):
    """Return a consistent JSON error payload plus HTTP status code.

    This is used for both "you sent a bad request" validation errors and
    "you aren’t allowed" permission errors, so the client can handle them the
    same way.
    """

    # Consistent JSON shape for the client.
    msg = {
            "ok": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
        

    }
    return jsonify(msg), status


