package models;

import java.util.Map;

/**
 * Pseudocode:
 * 1) Document Event model shape.
 * 2) Persist telemetry events to storage.
 */
public class Event {
  public String eventId;
  public String sessionId;
  public String timestamp;
  public Integer stageId;
  public String eventType;
  public Map<String, Object> payload;
  public String configId;
  public Boolean isValid;
}
