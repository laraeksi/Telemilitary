// src/telemetry/events.js
// Centralised list of all telemetry event names
// Keeps event usage consistent and easy to audit

export const TELEMETRY_EVENTS = {
  // Session lifecycle
  SESSION_START: "session_start",
  SESSION_END: "session_end",

  // Stage lifecycle
  STAGE_START: "stage_start",
  STAGE_COMPLETE: "stage_complete",
  STAGE_FAIL: "stage_fail",

  // Gameplay actions
  CARD_FLIP: "card_flip",
  MATCH_SUCCESS: "match_success",
  MATCH_FAIL: "match_fail",

  // Resources / economy
  RESOURCE_GAIN: "resource_gain",     // tokens earned
  RESOURCE_SPEND: "resource_spend",   // tokens spent

  // Powerups
  POWERUP_USED: "powerup_used",        // peek / freeze / undo

  // Player decisions
  RETRY_STAGE: "retry_stage",
  QUIT_GAME: "quit_game",

  // Settings / meta
  SETTINGS_CHANGE: "settings_change",
};
