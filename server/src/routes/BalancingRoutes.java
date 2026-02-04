package routes;

import java.util.List;
import types.Types;

/**
 * Pseudocode:
 * 1) Define balancing toolkit endpoints.
 * 2) Protect them for designers.
 */
public class BalancingRoutes {
  public static final List<Types.RouteDefinition> ROUTES = List.of(
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/balancing/parameters",
      "BalancingController.getParameters",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.POST,
      "/balancing/parameters",
      "BalancingController.saveParameters",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/balancing/suggestions",
      "BalancingController.suggestions",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.POST,
      "/balancing/simulate",
      "BalancingController.simulate",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/decisions",
      "BalancingController.decisions",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.POST,
      "/decisions",
      "BalancingController.createDecisionEntry",
      Types.Role.DESIGNER
    )
  );
}
