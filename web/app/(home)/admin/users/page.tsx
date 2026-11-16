import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { UsersFilters } from "./_components/users-filters";
import { UsersSection } from "./_components/users-section";
import { UsersSkeleton } from "./_components/users-skeleton";

export const instant = false;

export default function AdminUsersPage(props: PageProps<"/admin/users">) {
  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage accounts, roles, and sessions.
          </p>
        </div>
        <CreateUserDialog />
      </header>
      <Suspense fallback={<FiltersSkeleton />}>
        <UsersFilters />
      </Suspense>
      <Suspense fallback={<UsersSkeleton />}>
        <UsersSection searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Skeleton className="h-8 w-full sm:max-w-xs" />
      <Skeleton className="h-8 w-full sm:w-36" />
    </div>
  );
}
