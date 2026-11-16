import { createHash } from 'node:crypto';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

/** One window for every auth limit. */
export const AUTH_RATE_WINDOW_MS = 60_000;

/** Sign-in limits: per address and username, and per address alone. */
export interface AuthRateLimits {
  credentials: number;
  address: number;
}

/** The client address Express resolved; `trust proxy` decides which hop it is. */
function clientAddress(request: Record<string, unknown>): string {
  const forwarded = request.ips;

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]);
  }

  return typeof request.ip === 'string' && request.ip ? request.ip : 'unknown';
}

/** The submitted username, normalised, or `undefined` when there is none. */
function submittedUsername(
  request: Record<string, unknown>,
): string | undefined {
  const body = request.body;

  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  const { username } = body as { username?: unknown };

  if (typeof username !== 'string' || !username.trim()) {
    return undefined;
  }

  return username.trim().toLowerCase();
}

/**
 * One bucket per address and username: wrong guesses against one account from
 * one address. The username is hashed, so a throttle key never holds it, and
 * the address keeps one attacker from locking an account out everywhere.
 */
export function credentialsTracker(request: Record<string, unknown>): string {
  const address = clientAddress(request);
  const username = submittedUsername(request);

  if (!username) {
    return address;
  }

  const digest = createHash('sha256').update(username).digest('base64url');

  return `${address}:${digest}`;
}

/** One bucket per address: a spray of many usernames from a single address. */
export function addressTracker(request: Record<string, unknown>): string {
  return clientAddress(request);
}

export function authThrottlerOptions(
  limits: AuthRateLimits,
): ThrottlerModuleOptions {
  return [
    {
      name: 'auth',
      ttl: AUTH_RATE_WINDOW_MS,
      limit: limits.credentials,
      getTracker: credentialsTracker,
    },
    {
      name: 'auth-ip',
      ttl: AUTH_RATE_WINDOW_MS,
      limit: limits.address,
      getTracker: addressTracker,
    },
  ];
}
