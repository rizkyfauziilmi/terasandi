import { getCurrentUser } from "@/lib/auth";
import { UserMenuContent } from "./user-menu-content";

/** Server-rendered account menu. Must be rendered inside a Suspense boundary. */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return <UserMenuContent user={user} />;
}
