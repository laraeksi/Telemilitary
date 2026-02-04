package services.metrics;

import java.util.Collections;
import java.util.Map;

/**
 * Pseudocode:
 * 1) Compute fail rate, avg time, retries per stage.
 */
public class StageStats {
  public static Map<String, Object> getStageStats(String configId) {
    // TODO: Calculate fail rate, avg time, retries per stage.
    return Map.of("configId", configId, "stats", Collections.emptyList());
  }
}
