/**
 * Pseudocode:
 * 1) Read environment variables.
 * 2) Provide defaults for scaffolding only.
 * 3) Throw when a required env is missing.
 */

export const getEnv = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
};

export const ENV = {
  DATABASE_URL: getEnv("DATABASE_URL", "TODO_DATABASE_URL"),
  ADMIN_PASSWORD: getEnv("ADMIN_PASSWORD", "TODO_ADMIN_PASSWORD"),
  SEED_MODE: getEnv("SEED_MODE", "false") === "true",
};
