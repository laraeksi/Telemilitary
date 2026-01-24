/**
 * Pseudocode:
 * 1) Map a token to a role (mock).
 * 2) Enforce role for protected routes.
 * 3) Replace with real auth later.
 */

export const requireRole = (role) => (context) => {
  if (context.role !== role) {
    throw new Error(`Forbidden: requires ${role}`);
  }
};

export const mockAuthenticate = (token) => {
  // TODO: Replace with real auth. For now, map a token to a role.
  if (token === "designer") {
    return { userId: "designer_user", role: "designer" };
  }
  return { userId: "player_user", role: "player" };
};
