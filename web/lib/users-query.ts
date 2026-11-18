import { listUsersQuerySchema } from "@terasandi/contracts";
import type { ListUsersQueryDto } from "@terasandi/contracts";

export const USERS_PATH = "/admin/users";

/** How many accounts one page shows. */
const PAGE_SIZE = 20;

type UsersSearchParams = Awaited<PageProps<"/admin/users">["searchParams"]>;

/** Reads the URL into the validated query the API expects. */
export function parseUsersQuery(
  searchParams: UsersSearchParams,
): ListUsersQueryDto {
  const page = Math.max(1, Math.trunc(Number(first(searchParams.page)) || 1));
  const offset = (page - 1) * PAGE_SIZE;
  const parsed = listUsersQuerySchema.safeParse({
    q: first(searchParams.q),
    role: first(searchParams.role),
    limit: PAGE_SIZE,
    offset,
  });

  return parsed.success ? parsed.data : { limit: PAGE_SIZE, offset };
}

/** The query string sent to the users endpoint. */
export function usersApiQuery(query: ListUsersQueryDto): string {
  const params = filterParams(query);
  params.set("limit", String(query.limit));
  params.set("offset", String(query.offset));
  return params.toString();
}

/** A link to one page of the list, keeping the active filters. */
export function usersHref(query: ListUsersQueryDto, page: number): string {
  return withUsersParams(filterParams(query), { page });
}

/** The URL after a filter change; changing a filter resets the page. */
export function usersFilterHref(
  source: URLSearchParams | string,
  changes: { q?: string; role?: string },
): string {
  return withUsersParams(source, { ...changes, page: 1 });
}

function filterParams(
  query: Pick<ListUsersQueryDto, "q" | "role">,
): URLSearchParams {
  const params = new URLSearchParams();

  if (query.q) {
    params.set("q", query.q);
  }

  if (query.role) {
    params.set("role", query.role);
  }

  return params;
}

function withUsersParams(
  source: URLSearchParams | string,
  changes: { q?: string; role?: string; page?: number },
): string {
  const params = new URLSearchParams(source);

  setOrDelete(params, "q", changes.q);
  setOrDelete(params, "role", changes.role);

  if (changes.page !== undefined) {
    setOrDelete(
      params,
      "page",
      changes.page > 1 ? String(changes.page) : undefined,
    );
  }

  const search = params.toString();
  return search ? `${USERS_PATH}?${search}` : USERS_PATH;
}

function setOrDelete(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
