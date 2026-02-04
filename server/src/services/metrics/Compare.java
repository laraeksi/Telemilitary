package services.metrics;

import java.util.Collections;
import java.util.Map;

/**
 * Pseudocode:
 * 1) Compare metrics across multiple configs.
 */
public class Compare {
  public static Map<String, Object> getCompareMetrics(String[] configs) {
    // TODO: Compute comparison metrics across configs.
    return Map.of("configs", configs, "results", Collections.emptyList());
  }
}
