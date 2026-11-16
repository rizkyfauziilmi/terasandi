import { Suspense } from "react";
import { UserMenu } from "../user-menu";
import { Button } from "@/components/ui/button";
import { BellIcon } from "lucide-react";

export function RightSideHeader() {
  return (
    <div className="flex items-center gap-2.5">
      <Button size="icon-lg" variant="outline">
        <BellIcon />
      </Button>
      <Suspense
        fallback={
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
        }
      >
        <UserMenu />
      </Suspense>
    </div>
  );
}
