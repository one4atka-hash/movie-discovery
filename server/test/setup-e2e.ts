// Minimal env for AppModule(ConfigModule.validate)
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://cinema:cinema@localhost:5432/cinema';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
process.env.DB_RUN_MIGRATIONS = process.env.DB_RUN_MIGRATIONS ?? 'true';
process.env.DEV_ALERTS_ENABLED = process.env.DEV_ALERTS_ENABLED ?? 'true';
process.env.DEV_PUSH_SEND_ENABLED =
  process.env.DEV_PUSH_SEND_ENABLED ?? 'false';
process.env.TMDB_API_KEY = process.env.TMDB_API_KEY ?? 'test';

// Keep throttling relaxed for tests.
process.env.THROTTLE_TTL_SECONDS = process.env.THROTTLE_TTL_SECONDS ?? '60';
process.env.THROTTLE_LIMIT = process.env.THROTTLE_LIMIT ?? '1000';
