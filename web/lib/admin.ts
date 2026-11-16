import type { AuthUser } from "@terasandi/contracts";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";

/**
 * The signed-in admin, or a redirect: `/sign-in` when there is no session,
 * `/` when the session belongs to a non-admin.
 *
 * Reads cookies, so call it inside a Suspense boundary.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return user;
}
