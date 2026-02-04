package validators;

import java.util.ArrayList;
import java.util.List;
import models.Anomaly;
import models.Event;

/**
 * Pseudocode:
 * 1) Check required fields.
 * 2) Validate event_type against enum list.
 * 3) Flag impossible order/out-of-range later.
 */
public class EventValidator {
  private static final List<String> EVENT_TYPES = List.of(
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
    "settings_change"
  );

  public static ValidationResult validateEvent(Event event) {
    List<Anomaly> anomalies = new ArrayList<>();

    if (event == null) {
      Anomaly anomaly = new Anomaly();
      anomaly.anomalyId = "missing_event";
      anomaly.eventId = "unknown";
      anomaly.anomalyType = "missing_field";
      anomaly.detectedBy = "required_field_check";
      anomaly.resolutionStatus = "open";
      anomalies.add(anomaly);
      return new ValidationResult(false, anomalies);
    }

    addMissingFieldAnomaly(anomalies, event.eventId, "eventId", event.eventId);
    addMissingFieldAnomaly(anomalies, event.eventId, "timestamp", event.timestamp);
    addMissingFieldAnomaly(anomalies, event.eventId, "eventType", event.eventType);
    addMissingFieldAnomaly(anomalies, event.eventId, "sessionId", event.sessionId);
    addMissingFieldAnomaly(anomalies, event.eventId, "stageId", event.stageId);
    addMissingFieldAnomaly(anomalies, event.eventId, "configId", event.configId);
    addMissingFieldAnomaly(anomalies, event.eventId, "payload", event.payload);

    if (event.eventType == null || !EVENT_TYPES.contains(event.eventType)) {
      Anomaly anomaly = new Anomaly();
      anomaly.anomalyId = "invalid_event_type";
      anomaly.eventId = event.eventId;
      anomaly.anomalyType = "unknown";
      anomaly.detectedBy = "event_type_check";
      anomaly.resolutionStatus = "open";
      anomaly.details = java.util.Map.of("eventType", event.eventType);
      anomalies.add(anomaly);
    }

    // TODO: check impossible sequences using stored session events.
    // TODO: add out-of-range checks (negative time, moves, etc).

    return new ValidationResult(anomalies.isEmpty(), anomalies);
  }

  private static void addMissingFieldAnomaly(
    List<Anomaly> anomalies,
    String eventId,
    String field,
    Object value
  ) {
    if (value == null) {
      Anomaly anomaly = new Anomaly();
      anomaly.anomalyId = "missing_" + field;
      anomaly.eventId = eventId != null ? eventId : "unknown";
      anomaly.anomalyType = "missing_field";
      anomaly.detectedBy = "required_field_check";
      anomaly.resolutionStatus = "open";
      anomaly.details = java.util.Map.of("field", field);
      anomalies.add(anomaly);
    }
  }

  public static class ValidationResult {
    public final boolean isValid;
    public final List<Anomaly> anomalies;

    public ValidationResult(boolean isValid, List<Anomaly> anomalies) {
      this.isValid = isValid;
      this.anomalies = anomalies;
    }
  }
}
