import { cookies } from "next/headers";
import { ApiError, request } from "./api/client";
import { ACCESS_TOKEN_COOKIE } from "./auth-cookie";

/**
 * Calls the API with the access token from the session cookie.
 *
 * Unlike `fetchCurrentUser`, this never refreshes an expired token: the proxy
 * owns rotation, and spending a refresh token from a render or action would
 * race it (the API reads a second use as a stolen token and ends the session).
 * A `401` is surfaced as an `ApiError` for the caller to handle.
 */
export async function fetchWithSession<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    throw new ApiError(401, "Your session has ended. Please sign in again.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return request<T>(path, {
    ...init,
    headers,
    cache: "no-store",
  });
}

/** A write against the API with an optional JSON body. */
export function mutateWithSession<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const hasBody = body !== undefined;

  return fetchWithSession<T>(path, {
    method,
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
}
