package models;

import java.util.Map;

/**
 * Pseudocode:
 * 1) Document BalancingRule shape.
 * 2) Use for rule-based suggestions.
 */
public class BalancingRule {
  public String ruleId;
  public String name;
  public String triggerCondition;
  public Map<String, Object> suggestedChange;
  public String explanation;
}
