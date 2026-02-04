package seed;

/**
 * Pseudocode:
 * 1) Define default seed sizes.
 * 2) Keep counts for users/sessions/events/anomalies.
 */
public class SeedData {
  public static final SeedCounts DEFAULT_SEED_COUNTS = new SeedCounts(40, 80, 1500, 30, 150);

  public static class SeedCounts {
    public final int users;
    public final int sessions;
    public final int events;
    public final int decisions;
    public final int anomalies;

    public SeedCounts(int users, int sessions, int events, int decisions, int anomalies) {
      this.users = users;
      this.sessions = sessions;
      this.events = events;
      this.decisions = decisions;
      this.anomalies = anomalies;
    }
  }
}
