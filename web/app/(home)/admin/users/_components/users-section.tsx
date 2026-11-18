import { AlertCircleIcon, UsersIcon } from "lucide-react";
import type { UserPage } from "@terasandi/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { apiErrorMessage } from "@/lib/api/client";
import { fetchWithSession } from "@/lib/api-authenticated";
import { parseUsersQuery, usersApiQuery } from "@/lib/users-query";
import { UsersPagination } from "./users-pagination";
import { UsersTable } from "./users-table";

type SearchParams = Awaited<PageProps<"/admin/users">["searchParams"]>;

/**
 * Reads the URL, fetches one page of accounts, and renders the list. Its own
 * Suspense boundary keeps the rest of the page interactive while it loads.
 */
export async function UsersSection({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = parseUsersQuery(await searchParams);
  let result: UserPage;

  try {
    result = await fetchWithSession<UserPage>(`/users?${usersApiQuery(query)}`);
  } catch (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Could not load users</AlertTitle>
        <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  if (result.items.length === 0) {
    return <UsersEmpty isFiltered={Boolean(query.q || query.role)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <UsersTable users={result.items} />
      <UsersPagination query={query} total={result.total} />
    </div>
  );
}

function UsersEmpty({ isFiltered }: { isFiltered: boolean }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon />
        </EmptyMedia>
        <EmptyTitle>
          {isFiltered ? "No users match" : "No users yet"}
        </EmptyTitle>
        <EmptyDescription>
          {isFiltered
            ? "Try a different search or clear the role filter."
            : "Create the first account to get started."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
