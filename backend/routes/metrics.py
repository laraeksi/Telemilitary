# Metrics endpoints powering the dashboard.
# Aggregates telemetry into charts.
# routes/metrics.py
# Designer-only analytics endpoints built from aggregated telemetry data

from __future__ import annotations

from flask import Blueprint, request

from logic.metrics import (
    get_compare_metrics,
    get_fairness_metrics,
    get_funnel_metrics,
    get_progression_metrics,
    get_stage_stats,
)
from models import ConfigId
from utils.auth import require_dashboard
from utils.configs import get_config_ids
from utils.errors import error_response

# Blueprint for analytics / dashboard metrics
bp = Blueprint("metrics", __name__)


# Funnel metrics endpoint.
@bp.get("/api/metrics/funnel")
def funnel():
    # Returns stage-by-stage completion and drop-off data
    # Requires designer access.
    auth_error = require_dashboard()
    if auth_error:
        return auth_error

    config_id = request.args.get("config_id", "balanced")
    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    return get_funnel_metrics(
        config_id,
        request.args.get("from"),
        request.args.get("to"),
    )


# Stage stats metrics endpoint.
@bp.get("/api/metrics/stage-stats")
def stage_stats():
    # Returns per-stage difficulty statistics (fail rate, time, etc.)
    auth_error = require_dashboard()
    if auth_error:
        return auth_error

    # Default to balanced if none provided.
    config_id = request.args.get("config_id", "balanced")
    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    data = get_stage_stats(
        config_id,
        request.args.get("from"),
        request.args.get("to"),
    )
    return {
        "config_id": data["config_id"],
        "stages": data["stats"],
    }


# Progression metrics endpoint.
@bp.get("/api/metrics/progression")
def progression():
    # Returns progression curves (time and resource accumulation)
    auth_error = require_dashboard()
    if auth_error:
        return auth_error

    config_id = request.args.get("config_id", "balanced")
    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    return get_progression_metrics(
        config_id,
        request.args.get("from"),
        request.args.get("to"),
    )


# Fairness metrics endpoint.
@bp.get("/api/metrics/fairness")
def fairness():
    # Compares metrics across inferred player segments
    auth_error = require_dashboard()
    if auth_error:
        return auth_error

    # Segment can be "fast_vs_slow" or "high_vs_low".
    segment = request.args.get("segment", "all")
    config_id = request.args.get("config_id", "balanced")
    if config_id not in [c.value for c in ConfigId]:
        return error_response("config_id is invalid", details={"field": "config_id"})

    return get_fairness_metrics(
        segment,
        config_id,
        request.args.get("from"),
        request.args.get("to"),
    )


# Compare metrics across configs.
@bp.get("/api/metrics/compare")
def compare():
    # Compares multiple configs (e.g. easy vs balanced vs hard)
    auth_error = require_dashboard()
    if auth_error:
        return auth_error

    configs_param = request.args.get("configs")
    if configs_param:
        configs = [c.strip() for c in configs_param.split(",") if c.strip()]
    else:
        configs = request.args.getlist("config_id") or get_config_ids()

    for config_id in configs:
        if config_id not in [c.value for c in ConfigId]:
            return error_response("config_id is invalid", details={"field": "config_id"})

    return get_compare_metrics(
        configs,
        request.args.get("from"),
        request.args.get("to"),
    )
