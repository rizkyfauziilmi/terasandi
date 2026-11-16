import { AlertCircleIcon, UsersIcon } from "lucide-react";
import { listUsersQuerySchema } from "@terasandi/contracts";
import type { ListUsersQueryDto, UserPage } from "@terasandi/contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ApiError } from "@/lib/api";
import { fetchWithSession } from "@/lib/api-authenticated";
import { UsersPagination } from "./users-pagination";
import { UsersTable } from "./users-table";

/** How many accounts one page shows. */
const PAGE_SIZE = 20;

type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * Reads the URL, fetches one page of accounts, and renders the list. Its own
 * Suspense boundary keeps the rest of the page interactive while it loads.
 */
export async function UsersSection({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Math.trunc(Number(first(params.page)) || 1));

  const parsed = listUsersQuerySchema.safeParse({
    q: first(params.q),
    role: first(params.role),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const query: ListUsersQueryDto = parsed.success
    ? parsed.data
    : { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

  let result: UserPage;

  try {
    result = await fetchWithSession<UserPage>(`/users?${buildQuery(query)}`);
  } catch (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Could not load users</AlertTitle>
        <AlertDescription>
          {error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again."}
        </AlertDescription>
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
        <EmptyTitle>{isFiltered ? "No users match" : "No users yet"}</EmptyTitle>
        <EmptyDescription>
          {isFiltered
            ? "Try a different search or clear the role filter."
            : "Create the first account to get started."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function buildQuery(query: ListUsersQueryDto): string {
  const params = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
  });

  if (query.q) {
    params.set("q", query.q);
  }

  if (query.role) {
    params.set("role", query.role);
  }

  return params.toString();
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
