package routes;

import java.util.List;
import types.Types;

/**
 * Pseudocode:
 * 1) Define auth endpoints.
 * 2) Wire to controllers in router setup.
 */
public class AuthRoutes {
  public static final List<Types.RouteDefinition> ROUTES = List.of(
    new Types.RouteDefinition(Types.HttpMethod.POST, "/auth/login", "AuthController.login", null),
    new Types.RouteDefinition(Types.HttpMethod.GET, "/me", "AuthController.getMe", null)
  );
}
