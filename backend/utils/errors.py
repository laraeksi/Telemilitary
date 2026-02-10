from __future__ import annotations

from typing import Any


def error_response(
    message: str,
    *,
    code: str = "VALIDATION_ERROR",
    details: dict | None = None,
    status: int = 400,
):
    return (
        {
            "ok": False,
            "error": {"code": code, "message": message, "details": details or {}},
        },
        status,
    )
