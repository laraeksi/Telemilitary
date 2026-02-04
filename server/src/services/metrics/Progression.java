package services.metrics;

import java.util.Collections;
import java.util.Map;

/**
 * Pseudocode:
 * 1) Summarize time/moves/tokens by stage.
 */
public class Progression {
  public static Map<String, Object> getProgressionMetrics(String configId) {
    // TODO: Summarize time/moves/tokens per stage.
    return Map.of("configId", configId, "stages", Collections.emptyList());
  }
}
