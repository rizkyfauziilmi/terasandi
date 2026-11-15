import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  SignInDto,
} from "@terasandi/contracts";

/** The two endpoints that issue a session. */
export type AuthPath = "/auth/onboarding" | "/auth/sign-in";

export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

const API_URL = process.env.API_URL ?? "http://localhost:3001";

const UNREACHABLE =
  "Unable to reach the server. Please try again in a moment.";

/** Whether the API still needs its first user. `null` when it can't be reached. */
export async function getIsOnboarding(): Promise<boolean | null> {
  try {
    const response = await fetch(`${API_URL}/auth/onboarding`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as boolean;
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

/** Exchanges a refresh token for its successor. */
export function refreshSession(refreshToken: string): Promise<AuthTokens> {
  return postJson<AuthTokens>("/auth/refresh", { refreshToken });
}

/** Revokes the token family server-side. Best effort: local cookies go anyway. */
export async function revokeSession(refreshToken: string): Promise<void> {
  try {
    await postJson<void>("/auth/sign-out", { refreshToken });
  } catch {
    // The session is over locally even if the API can't be reached.
  }
}

export async function fetchCurrentUser(
  accessToken: string,
): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(0, UNREACHABLE);
  }

  if (!response.ok) {
    throw new AuthApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Nest errors look like `{ message, error, statusCode }`. */
async function readErrorMessage(response: Response): Promise<string> {
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
