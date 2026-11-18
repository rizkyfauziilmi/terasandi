"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { setUserPasswordSchema } from "@terasandi/contracts";
import type { AuthUser, SetUserPasswordDto } from "@terasandi/contracts";
import { useForm } from "react-hook-form";
import { resetUserPasswordAction } from "@/app/actions/users";
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
import { PasswordField } from "@/components/form";
import { notifyError, notifySuccess } from "@/lib/notify";

interface ResetPasswordDialogProps {
  user: AuthUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Sets a new password and signs the account out of every device. */
export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) {
  const formId = `admin-reset-${user.id}`;
  const form = useForm<SetUserPasswordDto>({
    mode: "onChange",
    resolver: zodResolver(setUserPasswordSchema),
    defaultValues: { password: "" },
  });
  const { isValid, isSubmitting } = form.formState;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);

    if (!next) {
      form.reset();
    }
  }

  async function onSubmit(data: SetUserPasswordDto) {
    const result = await resetUserPasswordAction(user.id, data);

    if ("error" in result) {
      notifyError("Could not reset password", result.error);
      return;
    }

    notifySuccess(
      "Password reset",
      `${user.username} was signed out of every device.`,
    );
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {user.username}. Their active sessions are
            revoked.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <PasswordField
              control={form.control}
              name="password"
              label="New password"
              idPrefix="admin"
              autoComplete="new-password"
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
            {isSubmitting ? "Saving…" : "Reset password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
