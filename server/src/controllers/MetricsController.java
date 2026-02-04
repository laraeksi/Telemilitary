package controllers;

import services.metrics.Compare;
import services.metrics.Fairness;
import services.metrics.Funnel;
import services.metrics.Progression;
import services.metrics.StageStats;

/**
 * Pseudocode:
 * 1) Call metric services by endpoint.
 * 2) Return aggregated data for dashboard.
 */
public class MetricsController {
  public static Object funnel(String configId) {
    return Funnel.getFunnelMetrics(configId);
  }

  public static Object stageStats(String configId) {
    return StageStats.getStageStats(configId);
  }

  public static Object progression(String configId) {
    return Progression.getProgressionMetrics(configId);
  }

  public static Object fairness(String segment, String configId) {
    return Fairness.getFairnessMetrics(segment, configId);
  }

  public static Object compare(String[] configs) {
    return Compare.getCompareMetrics(configs);
  }
}
