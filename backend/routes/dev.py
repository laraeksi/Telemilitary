# Dev-only helpers like seeding the DB.
# Not intended for production use.
# routes/dev.py
# Development-only routes used for local setup and testing

from __future__ import annotations
from flask import Blueprint
from data.db import init_db

# Blueprint for development utilities
bp = Blueprint("dev", __name__)


# Re-seed the database (dev only).
@bp.post("/api/seed")
def seed():
    # Reinitialises and seeds the database with default data
    # Used during development and testing only
    # Wipes and recreates tables.
    # Safe for local dev only.
    init_db()
    return {"ok": True, "seed": 42}
