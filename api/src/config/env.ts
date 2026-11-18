import { z } from 'zod';

const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d|w)$/;
const DURATION_UNITS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};
/** Object stores refuse presigned links longer than a week. */
const MAX_SIGNED_URL_TTL_MS = 7 * DURATION_UNITS.d;

/** Shared with FilesService so the reported expiry matches the signed link. */
export function durationToMs(value: string): number {
  const match = DURATION_PATTERN.exec(value);

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  return Number(match[1]) * DURATION_UNITS[match[2]];
}

const duration = (name: string) =>
  z
    .string()
    .regex(
      DURATION_PATTERN,
      `${name} must be a duration such as "15m" or "3600s"`,
    )
    .transform(
      (value) => value as `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w'}`,
    );

/** Fails at startup instead of on the first signed request. */
const signedUrlDuration = (name: string) =>
  duration(name).refine(
    (value) => durationToMs(value) <= MAX_SIGNED_URL_TTL_MS,
    `${name} must be at most 7 days`,
  );

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  ACCESS_TOKEN_TTL: duration('ACCESS_TOKEN_TTL').default('15m'),
  // Express `trust proxy`: on when the API sits behind a reverse proxy, so
  // rate limits and logs see the client address, not the proxy's.
  TRUST_PROXY: z.stringbool().default(false),
  // Sign-in attempts per address and username, per minute.
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  // Sign-in attempts per address alone, per minute: a spray of usernames.
  AUTH_IP_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  STORAGE_ENDPOINT: z.url().default('http://localhost:9000'),
  STORAGE_REGION: z.string().min(1).default('us-east-1'),
  STORAGE_BUCKET: z.string().min(3).default('terasandi-files'),
  STORAGE_ACCESS_KEY: z.string().min(1, 'STORAGE_ACCESS_KEY is required'),
  STORAGE_SECRET_KEY: z.string().min(1, 'STORAGE_SECRET_KEY is required'),
  STORAGE_FORCE_PATH_STYLE: z.stringbool().default(true),
  // Direct-to-MinIO uploads and downloads get short-lived signed URLs, so a
  // leaked link cannot be used for long. The file body never enters Next.js.
  UPLOAD_URL_TTL: signedUrlDuration('UPLOAD_URL_TTL').default('1h'),
  DOWNLOAD_URL_TTL: signedUrlDuration('DOWNLOAD_URL_TTL').default('15m'),
  MAX_FILE_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1024 * 1024 * 1024),
  // Parsed by the logger with `filterLogLevels`, which accepts a level
  // (`warn`), a list (`warn,error`) or a threshold (`>=debug`).
  LOG_LEVEL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
