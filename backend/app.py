from __future__ import annotations
# Flask app factory and route registration.
# Creates the Flask app and wires routes.

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


# App factory for Flask.
def create_app():
    # Create and configure the Flask app.
    app = Flask(__name__)
    app.config.from_object(Config)
    # Allow the dev client to call the API.
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Ensure tables exist and seed default configs.
    init_db()

    # Register route groups.
    # Each blueprint maps to a feature area.
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
    # Run a dev server locally.
    create_app().run(debug=True)
