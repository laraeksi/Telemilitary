from backend.logic.metrics import get_funnel_metrics


def test_funnel_metrics():
    result = get_funnel_metrics("balanced")
    assert result["config_id"] == "balanced"
