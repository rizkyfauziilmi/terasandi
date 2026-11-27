import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

const authRoutes = ["/sign-in", "/sign-up", "/onboarding"];

async function hasAnyUser() {
  const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
  return Boolean(existingUser);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const hasUsers = await hasAnyUser();

  if (session && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/sign-up") {
    return NextResponse.redirect(
      new URL(hasUsers ? "/sign-in" : "/onboarding", request.url),
    );
  }

  if (!session) {
    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(hasUsers ? "/sign-in" : "/onboarding", request.url),
      );
    }

    if (!hasUsers && pathname === "/sign-in") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (hasUsers && pathname === "/onboarding") {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/sign-in", "/sign-up", "/onboarding"],
};
