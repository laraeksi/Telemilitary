def get_funnel_metrics(config_id: str):
    return {"config_id": config_id, "stages": []}


def get_stage_stats(config_id: str):
    return {"config_id": config_id, "stats": []}


def get_progression_metrics(config_id: str):
    return {"config_id": config_id, "stages": []}


def get_fairness_metrics(segment: str, config_id: str):
    return {"config_id": config_id, "segment": segment, "comparison": []}


def get_compare_metrics(config_ids):
    return {"configs": config_ids, "results": []}
