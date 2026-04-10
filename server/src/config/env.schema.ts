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
