import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  SignInDto,
} from "@terasandi/contracts";

/** The two endpoints that issue a session. */
export type AuthPath = "/auth/onboarding" | "/auth/sign-in";

/** A failed API call: a non-2xx answer, or `0` when the API is unreachable. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const API_URL = process.env.API_URL ?? "http://localhost:3001";

const UNREACHABLE =
  "Unable to reach the server. Please try again in a moment.";

/**
 * One call to the API. A network failure and a non-2xx answer both surface as
 * an `ApiError`, so every caller maps a single error type. A `204` resolves to
 * `undefined`; anything else is parsed as JSON.
 */
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

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

export async function fetchCurrentUser(
  accessToken: string,
): Promise<AuthUser | null> {
  try {
    return await request<AuthUser>("/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

/** A JSON `POST` to the API. */
function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Nest errors look like `{ message, error, statusCode }`. */
export async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === "string" && body.message) {
      return body.message;
    }

    if (Array.isArray(body.message) && body.message.length > 0) {
      return body.message.join(". ");
    }
  } catch {
    // Fall through to a status-based message.
  }

  switch (response.status) {
    case 400:
      return "The submitted values are invalid.";
    case 401:
      return "Invalid username or password.";
    case 409:
      return "That username is already taken.";
    default:
      return "Something went wrong. Please try again.";
  }
}
