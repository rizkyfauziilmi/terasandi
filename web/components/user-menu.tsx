import { LogOutIcon } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

/** Server-rendered account chip. Must be rendered inside a Suspense boundary. */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Session expired</span>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="px-2 text-sm font-medium">{user.username}</span>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
        >
          <LogOutIcon />
        </Button>
      </form>
    </div>
  );
}
