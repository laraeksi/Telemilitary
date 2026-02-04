package routes;

import java.util.List;
import types.Types;

/**
 * Pseudocode:
 * 1) Define seed endpoint for designer.
 */
public class SeedRoutes {
  public static final List<Types.RouteDefinition> ROUTES = List.of(
    new Types.RouteDefinition(Types.HttpMethod.POST, "/seed", "SeedController.seed", Types.Role.DESIGNER)
  );
}
