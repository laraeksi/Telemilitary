package middleware;

import java.util.function.Consumer;
import types.Types;

/**
 * Pseudocode:
 * 1) Map a token to a role (mock).
 * 2) Enforce role for protected routes.
 * 3) Replace with real auth later.
 */
public class Auth {
  public static Consumer<Types.RequestContext> requireRole(Types.Role role) {
    return (context) -> {
      if (context == null || context.role != role) {
        throw new IllegalStateException("Forbidden: requires " + role);
      }
    };
  }

  public static Types.RequestContext mockAuthenticate(String token) {
    // TODO: Replace with real auth. For now, map a token to a role.
    Types.RequestContext context = new Types.RequestContext();
    if ("designer".equals(token)) {
      context.userId = "designer_user";
      context.role = Types.Role.DESIGNER;
    } else {
      context.userId = "player_user";
      context.role = Types.Role.PLAYER;
    }
    return context;
  }
}
