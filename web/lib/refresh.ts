import type { AuthTokens } from "@terasandi/contracts";
import { refreshSession } from "./api";

/**
 * Requests already waiting on the same refresh token. Two concurrent renders
 * presenting one token would spend it twice, which the API treats as a stolen
 * token and answers by revoking the whole family: the user signs out.
 */
const inFlight = new Map<string, Promise<AuthTokens | null>>();

/** Exchanges a refresh token once, sharing the result with concurrent callers. */
export function refreshOnce(refreshToken: string): Promise<AuthTokens | null> {
  const running = inFlight.get(refreshToken);

  if (running) {
    return running;
  }

  const pending = refreshSession(refreshToken)
    .catch(() => null)
    .finally(() => inFlight.delete(refreshToken));

  inFlight.set(refreshToken, pending);
  return pending;
}
