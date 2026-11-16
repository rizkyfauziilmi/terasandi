"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

/** The "all" sentinel is a UI value; the URL simply drops the filter. */
const ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admins" },
  { value: "user", label: "Users" },
];

/** Search and role filters. Each change rewrites the URL and resets the page. */
export function UsersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const query = searchParams.get("q") ?? "";
  const role = searchParams.get("role") ?? "all";
  const [search, setSearch] = useState(query);
  // The search text this component last wrote to the URL, so a URL change from
  // back/forward can be told apart from one caused by typing.
  const appliedQuery = useRef(query);

  const apply = useCallback(
    (changes: { q?: string; role?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      if (changes.q !== undefined) {
        appliedQuery.current = changes.q;
      }

      params.delete("page");

      const next = params.toString();
      startTransition(() => {
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (query !== appliedQuery.current) {
      appliedQuery.current = query;
      setSearch(query);
    }
  }, [query]);

  useEffect(() => {
    if (search === query) {
      return;
    }

    const timeout = setTimeout(() => apply({ q: search }), 300);
    return () => clearTimeout(timeout);
  }, [search, query, apply]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <InputGroup className="sm:max-w-xs">
        <InputGroupInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by username"
          aria-label="Search users by username"
        />
        <InputGroupAddon align="inline-start">
          <SearchIcon />
        </InputGroupAddon>
        {isPending && (
          <InputGroupAddon align="inline-end">
            <Spinner className="size-4" />
          </InputGroupAddon>
        )}
      </InputGroup>
      <Select
        items={ROLE_OPTIONS}
        value={role}
        onValueChange={(value) =>
          apply({ role: value === "all" ? "" : String(value) })
        }
      >
        <SelectTrigger className="w-full sm:w-36" aria-label="Filter by role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
