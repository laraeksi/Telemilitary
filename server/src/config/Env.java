package config;

/**
 * Pseudocode:
 * 1) Read environment variables.
 * 2) Provide defaults for scaffolding only.
 * 3) Throw when a required env is missing.
 */
public class Env {
  public static String getEnv(String key, String fallback) {
    String value = System.getenv(key);
    if (value == null) {
      value = fallback;
    }
    if (value == null) {
      throw new IllegalStateException("Missing env var: " + key);
    }
    return value;
  }

  public static class Config {
    public final String databaseUrl;
    public final String adminPassword;
    public final boolean seedMode;

    public Config(String databaseUrl, String adminPassword, boolean seedMode) {
      this.databaseUrl = databaseUrl;
      this.adminPassword = adminPassword;
      this.seedMode = seedMode;
    }
  }

  public static final Config ENV = new Config(
    getEnv("DATABASE_URL", "TODO_DATABASE_URL"),
    getEnv("ADMIN_PASSWORD", "TODO_ADMIN_PASSWORD"),
    "true".equals(getEnv("SEED_MODE", "false"))
  );
}
