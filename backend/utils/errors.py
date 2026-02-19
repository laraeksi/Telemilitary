from __future__ import annotations
# Shared error response helper.
# Standardizes error payloads.
from typing import Any
from flask import jsonify


# Build a standard error response.
def error_response(
    message: str,
    *,
    code: str = "VALIDATION_ERROR",
    details: dict | None = None,
    status: int = 400,
):
    # Returns a standard error payload and HTTP status code
    # Used across routes for validation and permission errors
    # Keeps response shape consistent for the UI.

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


