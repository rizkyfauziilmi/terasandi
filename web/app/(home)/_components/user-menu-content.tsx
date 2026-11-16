"use client";

import type { AuthUser } from "@terasandi/contracts";
import { LogOutIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The account dropdown: the admin console link and sign-out. */
export function UserMenuContent({ user }: { user: AuthUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="rounded-full"
            aria-label="Account menu"
          />
        }
      >
        <Avatar className="rounded-md">
          <AvatarImage
            src="https://github.com/shadcn.png"
            alt={user.username}
            className="rounded-md"
          />
          <AvatarFallback>{initials(user.username)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">
            {user.username}
          </DropdownMenuLabel>
          {user.role === "admin" ? (
            <DropdownMenuItem render={<Link href="/admin/users" />}>
              <UsersIcon />
              Users
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void signOutAction()}
          >
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}
