import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ListUsersQueryDto } from "@terasandi/contracts";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

interface UsersPaginationProps {
  query: ListUsersQueryDto;
  total: number;
}

/** Server-rendered pagination: links carry the active filters and the page. */
export function UsersPagination({ query, total }: UsersPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const currentPage = Math.floor(query.offset / query.limit) + 1;

  if (pageCount <= 1) {
    return null;
  }

  const hrefFor = (page: number) => {
    const params = new URLSearchParams();

    if (query.q) {
      params.set("q", query.q);
    }

    if (query.role) {
      params.set("role", query.role);
    }

    if (page > 1) {
      params.set("page", String(page));
    }

    const search = params.toString();
    return search ? `/admin/users?${search}` : "/admin/users";
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "user" : "users"}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PageButton
              href={hrefFor(currentPage - 1)}
              disabled={currentPage <= 1}
              label="Previous"
            />
          </PaginationItem>
          {pageNumbers(currentPage, pageCount).map((page, index) =>
            page === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <Button
                  variant={page === currentPage ? "outline" : "ghost"}
                  size="icon"
                  nativeButton={false}
                  aria-current={page === currentPage ? "page" : undefined}
                  render={<Link href={hrefFor(page)} />}
                >
                  {page}
                </Button>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PageButton
              href={hrefFor(currentPage + 1)}
              disabled={currentPage >= pageCount}
              label="Next"
              icon="end"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

interface PageButtonProps {
  href: string;
  disabled: boolean;
  label: string;
  icon?: "start" | "end";
}

function PageButton({ href, disabled, label, icon = "start" }: PageButtonProps) {
  const chevron =
    icon === "start" ? (
      <ChevronLeftIcon data-icon="inline-start" />
    ) : (
      <ChevronRightIcon data-icon="inline-end" />
    );

  if (disabled) {
    return (
      <Button variant="ghost" disabled>
        {icon === "start" && chevron}
        <span className="hidden sm:block">{label}</span>
        {icon === "end" && chevron}
      </Button>
    );
  }

  return (
    <Button variant="ghost" nativeButton={false} render={<Link href={href} />}>
      {icon === "start" && chevron}
      <span className="hidden sm:block">{label}</span>
      {icon === "end" && chevron}
    </Button>
  );
}

/** A short window around the current page with ellipses for the rest. */
function pageNumbers(current: number, count: number): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  for (let page = 1; page <= count; page++) {
    const isEdge = page === 1 || page === count;
    const isNear = Math.abs(page - current) <= 1;

    if (isEdge || isNear) {
      if (pages[pages.length - 1] !== page) {
        pages.push(page);
      }
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return pages;
}
