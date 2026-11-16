"use client";

import type { AuthUser } from "@terasandi/contracts";
import {
  KeyRoundIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import {
  deleteUserAction,
  revokeUserSessionsAction,
  updateUserRoleAction,
} from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { RenameUserDialog } from "./rename-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";

/** The per-row actions menu and the dialogs it opens. */
export function UserRowActions({ user }: { user: AuthUser }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isUser = user.role === "user";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${user.username}`}
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
              <PencilIcon />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setResetOpen(true)}>
              <KeyRoundIcon />
              Reset password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleOpen(true)}>
              {isUser ? <ShieldCheckIcon /> : <ShieldOffIcon />}
              {isUser ? "Promote to admin" : "Demote to user"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRevokeOpen(true)}>
              <LogOutIcon />
              Revoke sessions
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameUserDialog
        user={user}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <ResetPasswordDialog
        user={user}
        open={resetOpen}
        onOpenChange={setResetOpen}
      />
      <ConfirmActionDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        title={isUser ? "Promote to admin" : "Demote to user"}
        description={
          isUser
            ? `${user.username} will gain full access to the admin console.`
            : `${user.username} will lose access to the admin console.`
        }
        confirmLabel={isUser ? "Promote" : "Demote"}
        action={() =>
          updateUserRoleAction(user.id, { role: isUser ? "admin" : "user" })
        }
        success={{
          title: isUser ? "Promoted to admin" : "Demoted to user",
          description: `${user.username} now has the ${
            isUser ? "admin" : "user"
          } role.`,
        }}
      />
      <ConfirmActionDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke sessions"
        description={`Sign ${user.username} out of every device. Access tokens stay valid until they expire.`}
        confirmLabel="Revoke"
        action={() => revokeUserSessionsAction(user.id)}
        success={{
          title: "Sessions revoked",
          description: `${user.username} was signed out of every device.`,
        }}
      />
      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="destructive"
        title="Delete user"
        description={`Delete ${user.username} permanently. This cannot be undone. You cannot delete your own account.`}
        confirmLabel="Delete"
        action={() => deleteUserAction(user.id)}
        success={{
          title: "User deleted",
          description: `${user.username} was removed.`,
        }}
      />
    </>
  );
}
