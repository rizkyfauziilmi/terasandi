import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIsOnboarding } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";

const ONBOARDING_PATH = "/onboarding";
const SIGN_IN_PATH = "/sign-in";

/**
 * Optimistic routing guard. The token in the cookie is only checked for
 * presence here; the API still validates it on every request.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(ACCESS_TOKEN_COOKIE);
  const isOnboardingPage = pathname === ONBOARDING_PATH;
  const isSignInPage = pathname === SIGN_IN_PATH;

  // Signed in: never show onboarding or sign-in again.
  if (hasToken) {
    if (isOnboardingPage || isSignInPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  const isOnboarding = await getIsOnboarding();

  // The onboarding page is only reachable while the API has no users yet.
  if (isOnboardingPage) {
    return isOnboarding === false
      ? NextResponse.redirect(new URL(SIGN_IN_PATH, request.url))
      : NextResponse.next();
  }

  // Sign-in is only reachable once onboarding is done.
  if (isSignInPage) {
    return isOnboarding === true
      ? NextResponse.redirect(new URL(ONBOARDING_PATH, request.url))
      : NextResponse.next();
  }

  return NextResponse.redirect(
    new URL(isOnboarding === true ? ONBOARDING_PATH : SIGN_IN_PATH, request.url),
  );
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
