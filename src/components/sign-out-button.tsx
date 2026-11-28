"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await toast.promise(
      (async () => {
        const result = await authClient.signOut();

        if (result.error) {
          throw new Error(result.error.message ?? "Failed to sign out.");
        }

        router.replace("/sign-in");
        router.refresh();
      })(),
      {
        loading: "Signing out...",
        success: "Signed out successfully.",
        error: (error: unknown) =>
          error instanceof Error
            ? error.message
            : "Failed to sign out. Please try again.",
      },
    );
  }

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
