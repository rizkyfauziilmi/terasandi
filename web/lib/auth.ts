import type { AuthUser } from "@terasandi/contracts";
import { cookies } from "next/headers";
import { fetchCurrentUser } from "./api/auth";
import { ACCESS_TOKEN_COOKIE } from "./auth-cookie";

/**
 * The signed-in user, read from the API with the token in the cookie.
 * `null` when there is no token or the API rejects it (expired session).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  return fetchCurrentUser(accessToken);
}
