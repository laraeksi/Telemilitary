"""
Backend Flask app entrypoint.

This file uses a simple "app factory" pattern: `create_app()` builds the Flask
instance, applies config/middleware, and registers the feature blueprints.

I’m keeping the setup intentionally straightforward because this is a student
project and it’s easier to mark/reason about when everything is wired in one
place.
"""

from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from config import Config
from data.db import init_db

from routes.auth import bp as auth_bp
from routes.game_config import bp as game_config_bp
from routes.sessions import bp as sessions_bp
from routes.telemetry import bp as telemetry_bp
from routes.metrics import bp as metrics_bp
from routes.balancing import bp as balancing_bp
from routes.decisions import bp as decisions_bp
from routes.dev import bp as dev_bp


def create_app():
    """Create and configure the Flask application instance."""
    app = Flask(__name__)
    app.config.from_object(Config)
    # For local development we allow the frontend to call `/api/*`.
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Make sure the database/tables exist before any route tries to query them.
    init_db()

    # Routes are split into blueprints so each feature stays in its own file.
    app.register_blueprint(auth_bp)
    app.register_blueprint(game_config_bp)
    app.register_blueprint(sessions_bp)
    app.register_blueprint(telemetry_bp)
    app.register_blueprint(metrics_bp)
    app.register_blueprint(balancing_bp)
    app.register_blueprint(decisions_bp)
    app.register_blueprint(dev_bp)

    return app


if __name__ == "__main__":
    # Only runs when you execute `python app.py` directly (not when imported).
    create_app().run(debug=True)
