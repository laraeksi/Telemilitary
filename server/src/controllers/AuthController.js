/**
 * Pseudocode:
 * 1) Accept login credentials (mock).
 * 2) Return a token that maps to a role.
 * 3) Provide /me endpoint for role.
 */

export const login = async (username, password) => {
  // TODO: Replace with real authentication.
  const role = username === "designer" ? "designer" : "player";
  return { token: role, role };
};

export const getMe = async (context) => {
  return { userId: context.userId ?? "anonymous", role: context.role ?? "player" };
};
