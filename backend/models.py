# Data models and enums used across the backend.
# Mostly used as structured documentation.
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

# Models.py is acting as structured documentation at the moment but its not affecting behaviour
# These are still useful for shared naming.

# Difficulty config enum.
class ConfigId(str, Enum):
    # Difficulty options used in telemetry/configs.
    EASY = "easy"
    BALANCED = "balanced"
    HARD = "hard"


# Telemetry event types.
class EventType(str, Enum):
    # Session lifecycle
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    # Stage lifecycle
    STAGE_START = "stage_start"
    STAGE_COMPLETE = "stage_complete"
    STAGE_FAIL = "stage_fail"
    RETRY = "retry"
    QUIT = "quit"
    CARD_FLIP = "card_flip"
    MATCH_SUCCESS = "match_success"
    MATCH_FAIL = "match_fail"
    MOVE_USED = "move_used"
    RESOURCE_GAIN = "resource_gain"
    RESOURCE_SPEND = "resource_spend"
    POWERUP_USED = "powerup_used"
    SETTINGS_CHANGE = "settings_change"


# Reasons for failing a stage.
class FailReason(str, Enum):
    # Reasons for failing a stage.
    TIME = "time"
    MOVES = "moves"


# Powerup types used in telemetry.
class PowerupType(str, Enum):
    PEEK = "peek"
    FREEZE = "freeze"
    SHUFFLE = "shuffle"


# Session outcomes.
class Outcome(str, Enum):
    # Final outcome for a session.
    COMPLETED = "completed"
    QUIT = "quit"
    FAILED = "failed"


# User record shape.
@dataclass
class User:
    user_id: str
    created_at: str
    segment_tags: List[str] = field(default_factory=list)


# Session record shape.
@dataclass
class Session:
    session_id: str
    user_id: str
    config_id: ConfigId
    start_time: str
    end_time: Optional[str] = None
    outcome: Optional[Outcome] = None
    total_time_seconds: Optional[int] = None
    total_fails: Optional[int] = None
    total_tokens_spent: Optional[int] = None
    stages_completed: Optional[int] = None


# Stage record shape.
@dataclass
class Stage:
    stage_id: int
    name: str
    base_parameters: Dict[str, Any]
    completion_rule: str


# Config record shape.
@dataclass
class Config:
    config_id: ConfigId
    label: str
    parameter_set: Dict[str, Any]


# Event record shape.
@dataclass
class Event:
    event_id: str
    session_id: str
    user_id: str
    timestamp: str
    stage_id: int
    config_id: ConfigId
    event_type: EventType
    payload: Dict[str, Any]
    is_valid: Optional[bool] = None


# Anomaly record shape.
@dataclass
class Anomaly:
    anomaly_id: str
    event_id: str
    anomaly_type: str
    detected_by: str
    resolution_status: str
    created_at: str
    details: Dict[str, Any] = field(default_factory=dict)


# Balancing rule record shape.
@dataclass
class BalancingRule:
    rule_id: str
    name: str
    trigger_condition: str
    suggested_change: Dict[str, Any]
    explanation: str


# Decision log record shape.
@dataclass
class DecisionLog:
    decision_id: str
    config_id: ConfigId
    stage_id: Optional[int]
    change: Dict[str, Any]
    rationale: str
    evidence_links: List[str]
    timestamp: str
