"""
Development-only helper routes.

These endpoints exist to make local setup/testing quick (e.g., re-seeding the DB).
They are not meant for production deployments.
"""

from __future__ import annotations
from flask import Blueprint
from data.db import init_db

# Blueprint for development utilities.
bp = Blueprint("dev", __name__)


@bp.post("/api/seed")
def seed():
    """Reinitialise and seed the database (local dev/testing only)."""
    # This wipes/recreates tables, so it’s only safe on a local database.
    init_db()
    return {"ok": True, "seed": 42}
