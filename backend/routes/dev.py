# routes/dev.py
from __future__ import annotations

from flask import Blueprint

from data.db import init_db

bp = Blueprint("dev", __name__)


@bp.post("/api/seed")
def seed():
    init_db()
    return {"ok": True, "seed": 42}
