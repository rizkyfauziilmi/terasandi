import { REFRESH_TOKEN_MAX_AGE } from "@terasandi/contracts";

/** Name of the HttpOnly cookies that carry the API session. */
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

/**
 * Options shared by both session cookies. Server Actions and the proxy set
 * them on different response types, so this stays a plain object.
 */
export const authCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
  priority: "high" as const,
});

export const accessTokenCookieOptions = (expiresIn: number) =>
  authCookieOptions(expiresIn);

export const refreshTokenCookieOptions = () =>
  authCookieOptions(REFRESH_TOKEN_MAX_AGE);
