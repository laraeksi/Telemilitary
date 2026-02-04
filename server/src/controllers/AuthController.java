package controllers;

import types.Types;

/**
 * Pseudocode:
 * 1) Accept login credentials (mock).
 * 2) Return a token that maps to a role.
 * 3) Provide /me endpoint for role.
 */
public class AuthController {
  public static AuthResponse login(String username, String password) {
    // TODO: Replace with real authentication.
    Types.Role role = "designer".equals(username) ? Types.Role.DESIGNER : Types.Role.PLAYER;
    return new AuthResponse(role.name().toLowerCase(), role.name().toLowerCase());
  }

  public static MeResponse getMe(Types.RequestContext context) {
    String userId = context != null && context.userId != null ? context.userId : "anonymous";
    String role = context != null && context.role != null ? context.role.name().toLowerCase() : "player";
    return new MeResponse(userId, role);
  }

  public static class AuthResponse {
    public final String token;
    public final String role;

    public AuthResponse(String token, String role) {
      this.token = token;
      this.role = role;
    }
  }

  public static class MeResponse {
    public final String userId;
    public final String role;

    public MeResponse(String userId, String role) {
      this.userId = userId;
      this.role = role;
    }
  }
}
