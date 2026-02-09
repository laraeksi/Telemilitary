CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT,
  timestamp TEXT,
  stage_id INTEGER,
  config_id TEXT,
  event_type TEXT,
  payload TEXT,
  is_valid INTEGER
);

CREATE TABLE IF NOT EXISTS anomalies (
  anomaly_id TEXT PRIMARY KEY,
  event_id TEXT,
  anomaly_type TEXT,
  detected_by TEXT,
  resolution_status TEXT,
  created_at TEXT,
  details TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  config_id TEXT,
  start_time TEXT,
  end_time TEXT,
  outcome TEXT,
  total_time_seconds INTEGER,
  total_fails INTEGER,
  total_tokens_spent INTEGER,
  stages_completed INTEGER
);

CREATE TABLE IF NOT EXISTS decisions (
  decision_id TEXT PRIMARY KEY,
  config_id TEXT,
  stage_id INTEGER,
  change_json TEXT,
  rationale TEXT,
  evidence_links TEXT,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS configs (
  config_id TEXT PRIMARY KEY,
  label TEXT
);

CREATE TABLE IF NOT EXISTS stages (
  stage_id INTEGER,
  config_id TEXT,
  card_count INTEGER,
  timer_seconds INTEGER,
  move_limit INTEGER,
  mismatch_penalty_seconds INTEGER,
  PRIMARY KEY (stage_id, config_id)
);

CREATE TABLE IF NOT EXISTS helpers (
  stage_id INTEGER,
  config_id TEXT,
  helper_key TEXT,
  cost INTEGER,
  effect_seconds INTEGER,
  PRIMARY KEY (stage_id, config_id, helper_key)
);

CREATE TABLE IF NOT EXISTS token_rules (
  stage_id INTEGER,
  config_id TEXT,
  per_match INTEGER,
  on_complete INTEGER,
  PRIMARY KEY (stage_id, config_id)
);
