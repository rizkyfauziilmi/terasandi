import { z } from 'zod';

const duration = z
  .string()
  .regex(
    /^\d+(ms|s|m|h|d|w)$/,
    'ACCESS_TOKEN_TTL must be a duration such as "15m" or "3600s"',
  )
  .transform(
    (value) =>
      value as `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w'}`,
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
  ACCESS_TOKEN_TTL: duration.default('15m'),
  STORAGE_ENDPOINT: z.url().default('http://localhost:9000'),
  STORAGE_REGION: z.string().min(1).default('us-east-1'),
  STORAGE_BUCKET: z.string().min(3).default('terasandi-files'),
  STORAGE_ACCESS_KEY: z.string().min(1, 'STORAGE_ACCESS_KEY is required'),
  STORAGE_SECRET_KEY: z.string().min(1, 'STORAGE_SECRET_KEY is required'),
  STORAGE_FORCE_PATH_STYLE: z.stringbool().default(true),
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
