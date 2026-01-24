import { generateSeedData } from "./generateSeedData";

/**
 * Pseudocode:
 * 1) Generate seed data.
 * 2) Persist to database.
 */

export const runSeed = async () => {
  const seedData = generateSeedData();

  // TODO: Persist seed data to database.
  return {
    ok: true,
    seed: seedData.seed,
    counts: seedData.counts,
  };
};
