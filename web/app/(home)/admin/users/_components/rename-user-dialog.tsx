"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { updateUsernameSchema } from "@terasandi/contracts";
import type { AuthUser, UpdateUsernameDto } from "@terasandi/contracts";
import { useForm } from "react-hook-form";
import { renameUserAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { TextField } from "@/components/form";
import { notifyError, notifySuccess } from "@/lib/notify";

interface RenameUserDialogProps {
  user: AuthUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Changes the username an account signs in with. */
export function RenameUserDialog({
  user,
  open,
  onOpenChange,
}: RenameUserDialogProps) {
  const formId = `admin-rename-${user.id}`;
  const form = useForm<UpdateUsernameDto>({
    mode: "onChange",
    resolver: zodResolver(updateUsernameSchema),
    defaultValues: { username: user.username },
  });
  const { isValid, isSubmitting } = form.formState;

  async function onSubmit(data: UpdateUsernameDto) {
    const result = await renameUserAction(user.id, data);

    if ("error" in result) {
      notifyError("Could not rename user", result.error);
      return;
    }

    notifySuccess(
      "Username updated",
      `${user.username} is now ${data.username}.`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename user</DialogTitle>
          <DialogDescription>
            Change the username {user.username} signs in with.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <TextField
              control={form.control}
              name="username"
              label="Username"
              placeholder="jane_doe"
              idPrefix="admin"
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            type="submit"
            form={formId}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
