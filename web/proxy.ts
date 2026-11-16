import type { AuthTokens } from "@terasandi/contracts";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIsOnboarding } from "@/lib/api";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "@/lib/auth-cookie";
import { refreshOnce } from "@/lib/refresh";

const ONBOARDING_PATH = "/onboarding";
const SIGN_IN_PATH = "/sign-in";

/**
 * Optimistic routing guard. The API still validates the token on every
 * request; this only decides where the browser may go and rotates an expired
 * access token before the page renders.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const isOnboardingPage = pathname === ONBOARDING_PATH;
  const isSignInPage = pathname === SIGN_IN_PATH;

  // The access cookie expires with the token, so its absence is the signal to
  // exchange the refresh token before rendering.
  const outcome =
    !accessToken && refreshToken ? await refreshOnce(refreshToken) : null;
  const tokens = outcome?.status === "ok" ? outcome.tokens : null;
  // Only a token the API refused ends the session. Cookies survive an
  // unreachable API, or an outage would sign every user out.
  const rejected =
    !accessToken && Boolean(refreshToken) && outcome?.status === "rejected";
  const hasSession = Boolean(accessToken || tokens);

  // Signed in: never show onboarding or sign-in again.
  if (hasSession) {
    if (isOnboardingPage || isSignInPage) {
      return redirectTo(new URL("/", request.url), tokens, rejected);
    }

    return passThrough(request, tokens, rejected);
  }

  // Without an answer from the API we cannot tell where the user belongs.
  // Rendering is the safe move: redirecting would look signed out while the
  // cookies are still valid.
  if (outcome?.status === "unreachable") {
    return passThrough(request, null, false);
  }

  const isOnboarding = await getIsOnboarding();

  // The onboarding page is only reachable while the API has no users yet.
  if (isOnboardingPage) {
    return isOnboarding === false
      ? redirectTo(new URL(SIGN_IN_PATH, request.url), tokens, rejected)
      : passThrough(request, tokens, rejected);
  }

  // Sign-in is only reachable once onboarding is done.
  if (isSignInPage) {
    return isOnboarding === true
      ? redirectTo(new URL(ONBOARDING_PATH, request.url), tokens, rejected)
      : passThrough(request, tokens, rejected);
  }

  return redirectTo(
    new URL(isOnboarding === true ? ONBOARDING_PATH : SIGN_IN_PATH, request.url),
    tokens,
    rejected,
  );
}

function passThrough(
  request: NextRequest,
  tokens: AuthTokens | null,
  rejected: boolean,
) {
  if (!tokens) {
    const response = NextResponse.next();
    if (rejected) {
      clearCookies(response);
    }
    return response;
  }

  // The render must see the new access token, not the expired one the browser
  // sent, so the forwarded Cookie header is rebuilt.
  const headers = new Headers(request.headers);
  headers.set("cookie", cookieHeader(request, tokens));

  const response = NextResponse.next({ request: { headers } });
  attachCookies(response, tokens);
  return response;
}

function redirectTo(
  url: URL,
  tokens: AuthTokens | null,
  rejected: boolean,
) {
  const response = NextResponse.redirect(url);
  attachCookies(response, tokens);

  if (rejected) {
    clearCookies(response);
  }

  return response;
}

function attachCookies(response: NextResponse, tokens: AuthTokens | null) {
  if (!tokens) {
    return;
  }

  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    accessTokenCookieOptions(tokens.expiresIn),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    refreshTokenCookieOptions(),
  );
}

function clearCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
}

function cookieHeader(request: NextRequest, tokens: AuthTokens) {
  const replaced = new Set([ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]);

  return request.cookies
    .getAll()
    .filter((cookie) => !replaced.has(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .concat(
      `${ACCESS_TOKEN_COOKIE}=${tokens.accessToken}`,
      `${REFRESH_TOKEN_COOKIE}=${tokens.refreshToken}`,
    )
    .join("; ");
}

export const config = {
  matcher: [
    /*
     * Run on every page request, except for Next internals, metadata files,
     * and anything with a file extension (static assets).
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
