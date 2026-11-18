import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { validateEnv } from '../config/env.js';
import type { Env } from '../config/env.js';
import { createDrizzleOptions } from './drizzle.config.js';

function configService(overrides: Record<string, string> = {}) {
  return new ConfigService(
    validateEnv({
      DATABASE_URL: 'postgres://terasandi:terasandi@localhost:5432/terasandi',
      JWT_SECRET: 'a'.repeat(32),
      STORAGE_ACCESS_KEY: 'terasandi',
      STORAGE_SECRET_KEY: 'terasandi-dev-secret',
      ...overrides,
    }),
  ) as ConfigService<Env, true>;
}

describe('createDrizzleOptions', () => {
  it('carries the node-postgres driver and the configured connection', () => {
    expect(createDrizzleOptions(configService())).toEqual({
      drizzle,
      connection: 'postgres://terasandi:terasandi@localhost:5432/terasandi',
    });
  });

  it('takes the connection string from the validated environment', () => {
    const options = createDrizzleOptions(
      configService({ DATABASE_URL: 'postgres://user:pass@db:5432/other' }),
    );

    expect(options.connection).toBe('postgres://user:pass@db:5432/other');
  });
});
