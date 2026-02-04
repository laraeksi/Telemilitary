package routes;

import java.util.ArrayList;
import java.util.List;
import types.Types;

/**
 * Pseudocode:
 * 1) Combine all route groups.
 * 2) Provide to the HTTP server.
 */
public class Index {
  public static final List<Types.RouteDefinition> ROUTES;

  static {
    List<Types.RouteDefinition> allRoutes = new ArrayList<>();
    allRoutes.addAll(AuthRoutes.ROUTES);
    allRoutes.addAll(EventRoutes.ROUTES);
    allRoutes.addAll(MetricsRoutes.ROUTES);
    allRoutes.addAll(BalancingRoutes.ROUTES);
    allRoutes.addAll(SeedRoutes.ROUTES);
    ROUTES = List.copyOf(allRoutes);
  }
}
