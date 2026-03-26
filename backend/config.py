"""
Small configuration holder for the Flask backend.

This is intentionally minimal: just the database path and a debug flag.
Having these in one place makes it easy to point the app at a different DB
file during testing without hunting through multiple modules.
"""

class Config:
    # SQLite database file path used by `data/db.py`.
    DB_PATH = "data/game.db"
    # Debug mode is helpful locally (don’t use it in production).
    DEBUG = True
    # CORS is configured in `app.py` because it’s part of app setup.
    # If we add more settings later, they can live here too.
