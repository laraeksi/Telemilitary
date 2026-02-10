# utils/errors.py
# Helper for returning consistent JSON error responses

from __future__ import annotations
from typing import Any


def error_response(
    message: str,
    *,
    code: str = "VALIDATION_ERROR",
    details: dict | None = None,
    status: int = 400,
):
    # Returns a standard error payload and HTTP status code
    # Used across routes for validation and permission errors
    return (
        {
            "ok": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
        },
        status,
    )
