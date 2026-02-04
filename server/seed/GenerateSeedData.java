package seed;

import java.util.Collections;
import java.util.List;

/**
 * Pseudocode:
 * 1) Use a deterministic RNG with a seed.
 * 2) Generate users, sessions, events, decisions, anomalies.
 * 3) Return arrays for persistence.
 */
public class GenerateSeedData {
  public static SeedResult generateSeedData(SeedOptions options) {
    SeedData.SeedCounts counts = SeedData.DEFAULT_SEED_COUNTS;
    int seed = 42;

    if (options != null) {
      if (options.counts != null) {
        counts = options.counts;
      }
      if (options.seed != null) {
        seed = options.seed;
      }
    }

    // TODO: Replace with deterministic RNG seeded by `seed`.
    // TODO: Generate users, sessions, events, decisions, anomalies.

    return new SeedResult(
      seed,
      counts,
      Collections.emptyList(),
      Collections.emptyList(),
      Collections.emptyList(),
      Collections.emptyList(),
      Collections.emptyList()
    );
  }

  public static class SeedOptions {
    public Integer seed;
    public SeedData.SeedCounts counts;
  }

  public static class SeedResult {
    public final int seed;
    public final SeedData.SeedCounts counts;
    public final List<Object> users;
    public final List<Object> sessions;
    public final List<Object> events;
    public final List<Object> decisions;
    public final List<Object> anomalies;

    public SeedResult(
      int seed,
      SeedData.SeedCounts counts,
      List<Object> users,
      List<Object> sessions,
      List<Object> events,
      List<Object> decisions,
      List<Object> anomalies
    ) {
      this.seed = seed;
      this.counts = counts;
      this.users = users;
      this.sessions = sessions;
      this.events = events;
      this.decisions = decisions;
      this.anomalies = anomalies;
    }
  }
}
