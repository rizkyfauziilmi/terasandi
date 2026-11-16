import { Suspense } from "react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/admin";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="w-full self-start p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Suspense fallback={<AdminSkeleton />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </div>
    </div>
  );
}

/** Reads the session and redirects anyone who is not an admin. */
async function AdminGate({ children }: { children: ReactNode }) {
  await requireAdmin();
  return children;
}

function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
