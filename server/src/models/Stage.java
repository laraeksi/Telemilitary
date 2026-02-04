package models;

import java.util.Map;

/**
 * Pseudocode:
 * 1) Document Stage model shape.
 * 2) Stage config lives in shared/stages.js.
 */
public class Stage {
  public int stageId;
  public String name;
  public Map<String, Object> baseParameters;
  public String completionRule;
}
