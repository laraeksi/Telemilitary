package seed;

/**
 * Pseudocode:
 * 1) Generate seed data.
 * 2) Persist to database.
 */
public class SeedRunner {
  public static RunSeedResult runSeed() {
    GenerateSeedData.SeedResult seedData = GenerateSeedData.generateSeedData(null);

    // TODO: Persist seed data to database.
    return new RunSeedResult(true, seedData.seed, seedData.counts);
  }

  public static class RunSeedResult {
    public final boolean ok;
    public final int seed;
    public final SeedData.SeedCounts counts;

    public RunSeedResult(boolean ok, int seed, SeedData.SeedCounts counts) {
      this.ok = ok;
      this.seed = seed;
      this.counts = counts;
    }
  }
}
