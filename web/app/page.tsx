import { Suspense } from "react";
import { ModeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2 sm:px-6">
        <span className="text-lg font-semibold">Terasandi</span>
        <div className="flex items-center gap-2">
          <Suspense
            fallback={
              <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
            }
          >
            <UserMenu />
          </Suspense>
          <ModeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      </main>
    </div>
  );
}
