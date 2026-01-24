import { DEFAULT_SEED_COUNTS } from "./seedData";

/**
 * Pseudocode:
 * 1) Use a deterministic RNG with a seed.
 * 2) Generate users, sessions, events, decisions, anomalies.
 * 3) Return arrays for persistence.
 */

export const generateSeedData = (options = {}) => {
  const counts = { ...DEFAULT_SEED_COUNTS, ...options.counts };
  const seed = options.seed ?? 42;

  // TODO: Replace with deterministic RNG seeded by `seed`.
  // TODO: Generate users, sessions, events, decisions, anomalies.

  return {
    seed,
    counts,
    users: [],
    sessions: [],
    events: [],
    decisions: [],
    anomalies: [],
  };
};
