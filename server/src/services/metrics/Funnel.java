package services.metrics;

import java.util.Collections;
import java.util.Map;

/**
 * Pseudocode:
 * 1) Aggregate stage_start -> stage_complete per stage.
 * 2) Compute conversion/drop-off.
 */
public class Funnel {
  public static Map<String, Object> getFunnelMetrics(String configId) {
    // TODO: Aggregate funnel metrics from telemetry events.
    return Map.of("configId", configId, "stages", Collections.emptyList());
  }
}
