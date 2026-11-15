/** A user as returned by the API. Dates arrive as ISO strings over JSON. */
export interface ApiUser {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

/** Response of `POST /auth/onboarding` and `POST /auth/sign-in`. */
export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  expiresIn: number;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

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

export async function postAuth(
  path: "/auth/onboarding" | "/auth/sign-in",
  credentials: AuthCredentials,
): Promise<AuthResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });
  } catch {
    throw new AuthApiError(
      0,
      "Unable to reach the server. Please try again in a moment.",
    );
  }

  if (!response.ok) {
    throw new AuthApiError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as AuthResponse;
}

export async function fetchCurrentUser(
  accessToken: string,
): Promise<ApiUser | null> {
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ApiUser;
  } catch {
    return null;
  }
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
