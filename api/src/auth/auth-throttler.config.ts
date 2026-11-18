import type { ConfigService } from '@nestjs/config';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Env } from '../config/env.js';
import { authThrottlerOptions } from './auth-throttler.js';

/** The two sign-in limits, read from the validated environment. */
export function createAuthThrottlerOptions(
  config: ConfigService<Env, true>,
): ThrottlerModuleOptions {
  return authThrottlerOptions({
    credentials: config.get('AUTH_RATE_LIMIT', { infer: true }),
    address: config.get('AUTH_IP_RATE_LIMIT', { infer: true }),
  });
}
