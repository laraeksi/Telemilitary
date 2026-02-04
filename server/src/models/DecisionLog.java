package models;

import java.util.List;
import java.util.Map;

/**
 * Pseudocode:
 * 1) Document DecisionLog shape.
 * 2) Store human decisions about balancing changes.
 */
public class DecisionLog {
  public String decisionId;
  public String configId;
  public Integer stageId;
  public Map<String, Object> change;
  public String rationale;
  public List<String> evidenceLinks;
  public String timestamp;
}
