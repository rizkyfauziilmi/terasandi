"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBytes } from "@/lib/files";

/** Shared dialog chrome for both staged and stored file previews. */
export function FilePreviewModal({
  open,
  onOpenChange,
  name,
  size,
  mimeType,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  size?: number;
  mimeType?: string;
  children: ReactNode;
}) {
  const details = [
    size === undefined ? null : formatBytes(size),
    mimeType || null,
  ].filter((value): value is string => value !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{name}</DialogTitle>
          <DialogDescription>{details.join(" · ")}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
