package routes;

import java.util.List;
import types.Types;

/**
 * Pseudocode:
 * 1) Define aggregated metrics endpoints.
 * 2) Lock to designer role.
 */
public class MetricsRoutes {
  public static final List<Types.RouteDefinition> ROUTES = List.of(
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/metrics/funnel",
      "MetricsController.funnel",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/metrics/stage-stats",
      "MetricsController.stageStats",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/metrics/progression",
      "MetricsController.progression",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/metrics/fairness",
      "MetricsController.fairness",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/metrics/compare",
      "MetricsController.compare",
      Types.Role.DESIGNER
    )
  );
}
