/**
 * Low-level plumbing for every API call. A network failure and a non-2xx
 * answer both surface as `ApiError`, so callers only handle one error type.
 */
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

const UNREACHABLE = "Unable to reach the server. Please try again in a moment.";

/**
 * One call to the API. A `204` resolves to `undefined`; anything else is
 * parsed as JSON.
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

/** A JSON `POST` to the API. */
export function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** The message to show when an API call fails, whatever caused it. */
export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
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
