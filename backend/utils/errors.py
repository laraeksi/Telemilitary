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
    # Returns a standard error payload and HTTP status code
    # Used across routes for validation and permission errors

    msg = {
            "ok": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
        

    }
    return jsonify(msg), status


