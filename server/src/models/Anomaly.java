package models;

import java.util.Map;

/**
 * Pseudocode:
 * 1) Document Anomaly model shape.
 * 2) Store validation issues for analytics.
 */
public class Anomaly {
  public String anomalyId;
  public String eventId;
  public String anomalyType;
  public String detectedBy;
  public String resolutionStatus;
  public Map<String, Object> details;
}
