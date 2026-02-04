package models;

/**
 * Pseudocode:
 * 1) Document Session model shape.
 * 2) Attach summary stats later.
 */
public class Session {
  public String sessionId;
  public String userId;
  public String configId;
  public String startTime;
  public String endTime;
  public String outcome;
  public Integer totalTimeSeconds;
  public Integer totalFails;
  public Integer totalTokensSpent;
}
