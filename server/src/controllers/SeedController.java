package controllers;

import seed.SeedRunner;

/**
 * Pseudocode:
 * 1) Run seed generator.
 * 2) Persist synthetic data.
 */
public class SeedController {
  public static Object seed() {
    return SeedRunner.runSeed();
  }
}
