"use client";

import { useState } from "react";
import type { UserActionState } from "@/app/actions/users";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "default" | "destructive";
  action: () => Promise<UserActionState>;
  success: { title: string; description: string };
}

/** A confirmation dialog that runs one admin action and reports the outcome. */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "default",
  action,
  success,
}: ConfirmActionDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function confirm() {
    setIsPending(true);
    let result: UserActionState;

    try {
      result = await action();
    } finally {
      setIsPending(false);
    }

    if ("error" in result) {
      notifyError(title, result.error);
      return;
    }

    notifySuccess(success.title, success.description);
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button variant={variant} disabled={isPending} onClick={confirm}>
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
