def get_suggestions(config_id: str):
    return {"config_id": config_id, "suggestions": []}


def simulate_balance_change(payload):
    return {
        "predicted_completion_rates": [],
        "predicted_fail_reasons": [],
        "predicted_token_usage": [],
    }
