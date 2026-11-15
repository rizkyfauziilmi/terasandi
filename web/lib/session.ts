import type { AuthTokens } from "@terasandi/contracts";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "./auth-cookie";

/** Store both session cookies. Server Actions and Route Handlers only. */
export async function setAuthCookies(tokens: AuthTokens) {
  const cookieStore = await cookies();

  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    accessTokenCookieOptions(tokens.expiresIn),
  );
  cookieStore.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    refreshTokenCookieOptions(),
  );
}

/** Remove both session cookies. Server Actions and Route Handlers only. */
export async function clearAuthCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

/** The refresh token, for the sign-out that revokes it server-side. */
export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}
