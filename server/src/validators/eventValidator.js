/**
 * Pseudocode:
 * 1) Check required fields.
 * 2) Validate event_type against enum list.
 * 3) Flag impossible order/out-of-range later.
 */

const EVENT_TYPES = [
  "session_start",
  "session_end",
  "stage_start",
  "stage_complete",
  "stage_fail",
  "retry",
  "quit",
  "card_flip",
  "match_success",
  "match_fail",
  "move_used",
  "resource_gain",
  "resource_spend",
  "powerup_used",
  "settings_change",
];

export const validateEvent = (event) => {
  const anomalies = [];

  const requiredFields = [
    "eventId",
    "timestamp",
    "eventType",
    "userId",
    "sessionId",
    "stageId",
    "configId",
    "payload",
  ];

  requiredFields.forEach((field) => {
    if (event[field] === undefined || event[field] === null) {
      anomalies.push({
        anomalyId: `missing_${field}`,
        eventId: event.eventId ?? "unknown",
        anomalyType: "missing_field",
        detectedBy: "required_field_check",
        resolutionStatus: "open",
        details: { field },
      });
    }
  });

  if (!EVENT_TYPES.includes(event.eventType)) {
    anomalies.push({
      anomalyId: "invalid_event_type",
      eventId: event.eventId,
      anomalyType: "unknown",
      detectedBy: "event_type_check",
      resolutionStatus: "open",
      details: { eventType: event.eventType },
    });
  }

  // TODO: check impossible sequences using stored session events.
  // TODO: add out-of-range checks (negative time, moves, etc).

  return { isValid: anomalies.length === 0, anomalies };
};
