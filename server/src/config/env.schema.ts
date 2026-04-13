import { z } from 'zod';

export const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1),
  DB_RUN_MIGRATIONS: z
    .string()
    .optional()
    .transform((v) => (v ?? '').toLowerCase())
    .pipe(z.enum(['', '0', '1', 'false', 'true', 'no', 'yes', 'off', 'on'])),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),

  /** Comma-separated list of allowed origins. Empty = deny all (except same-origin in proxy setups). */
  CORS_ORIGINS: z.string().optional().default(''),
  CORS_CREDENTIALS: z
    .string()
    .optional()
    .transform((v) => (v ?? '').toLowerCase())
    .pipe(z.enum(['', '0', '1', 'false', 'true', 'no', 'yes', 'off', 'on'])),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(30),

  /**
   * Swagger/OpenAPI docs.
   * Keep disabled by default (enable explicitly per environment).
   */
  SWAGGER_ENABLED: z
    .string()
    .optional()
    .transform((v) => (v ?? '').toLowerCase())
    .pipe(z.enum(['', '0', '1', 'false', 'true', 'no', 'yes', 'off', 'on']))
    .default(''),

  /**
   * Dev-only endpoint to trigger alerts generation for current user.
   * Keep disabled by default.
   */
  DEV_ALERTS_ENABLED: z
    .string()
    .optional()
    .transform((v) => (v ?? '').toLowerCase())
    .pipe(z.enum(['', '0', '1', 'false', 'true', 'no', 'yes', 'off', 'on']))
    .default(''),

  /**
   * Optional TMDB v3 key for server-side helpers (e.g. providers catalog).
   * Keep optional to avoid hard dependency in local dev.
   */
  TMDB_API_KEY: z.string().optional().default(''),
  TMDB_BASE_URL: z.string().optional().default('https://api.themoviedb.org/3'),

  /**
   * Periodically sync tracked movies with TMDB watch providers → availability_snapshots/events.
   */
  AVAILABILITY_CRON_ENABLED: z
    .string()
    .optional()
    .transform((v) => (v ?? '').toLowerCase())
    .pipe(z.enum(['', '0', '1', 'false', 'true', 'no', 'yes', 'off', 'on']))
    .default(''),

  AVAILABILITY_CRON_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(3_600_000),

  /** Cache TTL for GET /movies/:id/releases (TMDB release_dates). */
  MOVIE_RELEASES_CACHE_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(86_400_000),

  /** Optional cron: enqueue release reminder notifications from movie_release_snapshots. */
  RELEASE_REMINDERS_CRON_ENABLED: z
    .string()
    .optional()
    .transform((v) => (v ?? '').toLowerCase())
    .pipe(z.enum(['', '0', '1', 'false', 'true', 'no', 'yes', 'off', 'on']))
    .default(''),

  RELEASE_REMINDERS_CRON_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(86_400_000),

  /** ISO region used when resolving dates from cached TMDB release_dates. */
  RELEASE_REMINDERS_REGION: z.string().optional().default('US'),

  /**
   * Web Push VAPID keys (URL-safe base64). Public key is exposed at GET /api/push/vapid-public;
   * private key reserved for future outbound notifications.
   */
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(raw: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'env'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}

export function truthy(v: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((v ?? '').toLowerCase());
}
