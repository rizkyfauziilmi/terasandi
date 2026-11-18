import type { ConfigService } from '@nestjs/config';
import type { DrizzleModuleFactoryOptions } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Env } from '../config/env.js';

/**
 * One PostgreSQL database, built once per application by DrizzleModule from
 * the validated connection string. Creating the options does not connect.
 */
export function createDrizzleOptions(
  config: ConfigService<Env, true>,
): DrizzleModuleFactoryOptions {
  return {
    drizzle,
    connection: config.get('DATABASE_URL', { infer: true }),
  };
}
