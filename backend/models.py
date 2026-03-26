"""
Shared models and enums (lightweight "types" for the backend).

This file doesn’t talk to the database directly. Instead, it acts like a shared
vocabulary for the project: consistent strings for config IDs, event types, and
simple dataclasses that describe what records look like.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

# This is mainly "structured documentation" (i.e., types + naming) and it
# shouldn’t change runtime behaviour. It’s still useful for clarity and marking.

class ConfigId(str, Enum):
    """Difficulty options (used for configs + telemetry)."""
    EASY = "easy"
    BALANCED = "balanced"
    HARD = "hard"


class EventType(str, Enum):
    """Allowed event type strings stored in the `events` table."""
    # Session lifecycle events
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    # Stage lifecycle events
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


class FailReason(str, Enum):
    """Standard reasons for stage failure (helps keep analytics consistent)."""
    TIME = "time"
    MOVES = "moves"


class PowerupType(str, Enum):
    """Powerups that the client may report using telemetry."""
    PEEK = "peek"
    FREEZE = "freeze"
    SHUFFLE = "shuffle"


class Outcome(str, Enum):
    """Final outcome for a session."""
    COMPLETED = "completed"
    QUIT = "quit"
    FAILED = "failed"


@dataclass
class User:
    """User record shape (as returned from DB queries / API responses)."""
    user_id: str
    created_at: str
    segment_tags: List[str] = field(default_factory=list)


@dataclass
class Session:
    """Session record shape."""
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


@dataclass
class Stage:
    """Stage record shape (static stage definition)."""
    stage_id: int
    name: str
    base_parameters: Dict[str, Any]
    completion_rule: str


@dataclass
class Config:
    """Config record shape (difficulty parameter set)."""
    config_id: ConfigId
    label: str
    parameter_set: Dict[str, Any]


@dataclass
class Event:
    """Event record shape (telemetry row)."""
    event_id: str
    session_id: str
    user_id: str
    timestamp: str
    stage_id: int
    config_id: ConfigId
    event_type: EventType
    payload: Dict[str, Any]
    is_valid: Optional[bool] = None


@dataclass
class Anomaly:
    """Anomaly record shape (validation issues for telemetry)."""
    anomaly_id: str
    event_id: str
    anomaly_type: str
    detected_by: str
    resolution_status: str
    created_at: str
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BalancingRule:
    """Balancing rule record shape (used by the balancing logic/routes)."""
    rule_id: str
    name: str
    trigger_condition: str
    suggested_change: Dict[str, Any]
    explanation: str


@dataclass
class DecisionLog:
    """Decision log record shape (audit trail of tuning decisions)."""
    decision_id: str
    config_id: ConfigId
    stage_id: Optional[int]
    change: Dict[str, Any]
    rationale: str
    evidence_links: List[str]
    timestamp: str
