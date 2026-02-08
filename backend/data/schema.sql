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
