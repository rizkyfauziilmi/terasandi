import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  SignInDto,
} from "@terasandi/contracts";
import { ApiError, postJson, request } from "./client";

/** The two endpoints that issue a session. */
export type AuthPath = "/auth/onboarding" | "/auth/sign-in";

/** Whether the API still needs its first user. `null` when it can't be reached. */
export async function getIsOnboarding(): Promise<boolean | null> {
  try {
    return await request<boolean>("/auth/onboarding", { cache: "no-store" });
  } catch {
    return null;
  }
}

export function postAuth(
  path: AuthPath,
  credentials: SignInDto,
): Promise<AuthResponse> {
  return postJson<AuthResponse>(path, credentials);
}

/** What one refresh attempt means for the session stored in the cookies. */
export type RefreshOutcome =
  | { status: "ok"; tokens: AuthTokens }
  | { status: "rejected" }
  | { status: "unreachable" };

/**
 * Exchanges a refresh token for its successor. A token the API refuses ends
 * the session; an unreachable or failing API does not, so an outage cannot
 * sign every user out.
 */
export async function refreshSession(
  refreshToken: string,
): Promise<RefreshOutcome> {
  try {
    const tokens = await postJson<AuthTokens>("/auth/refresh", {
      refreshToken,
    });

    return { status: "ok", tokens };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 401 || error.status === 403)
    ) {
      return { status: "rejected" };
    }

    return { status: "unreachable" };
  }
}

/** Revokes the token family server-side. `false` when the API could not be reached. */
export async function revokeSession(refreshToken: string): Promise<boolean> {
  try {
    await postJson<void>("/auth/sign-out", { refreshToken });
    return true;
  } catch {
    // The session is over locally even if the API can't be reached.
    return false;
  }
}

/**
 * The signed-in user, or `null` when the API rejects the token. Other failures
 * are propagated so an outage is not mistaken for a signed-out session.
 */
export async function fetchCurrentUser(
  accessToken: string,
): Promise<AuthUser | null> {
  try {
    return await request<AuthUser>("/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}
