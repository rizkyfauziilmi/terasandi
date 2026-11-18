import type { AuthenticationModuleOptions } from '@nestjs/authentication';
import type { ConfigService } from '@nestjs/config';
import { REFRESH_TOKEN_TTL } from '@terasandi/contracts';
import type { Env } from '../config/env.js';

/** The audience and issuer the web app's tokens are bound to. */
const JWT_ISSUER = 'terasandi';
const JWT_AUDIENCE = 'terasandi-web';

/** Refresh families outlive any single token, but not this absolute limit. */
const REFRESH_TOKEN_ABSOLUTE_TTL = '90d';

/** The signing key and access-token TTL come from the validated environment. */
export function createAuthenticationOptions(
  config: ConfigService<Env, true>,
): AuthenticationModuleOptions {
  return {
    accessToken: {
      key: config.get('JWT_SECRET', { infer: true }),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      ttl: config.get('ACCESS_TOKEN_TTL', { infer: true }),
    },
    refreshToken: {
      ttl: REFRESH_TOKEN_TTL,
      absoluteTtl: REFRESH_TOKEN_ABSOLUTE_TTL,
    },
  };
}
