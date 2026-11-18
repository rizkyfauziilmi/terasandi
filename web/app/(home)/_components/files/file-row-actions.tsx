"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { RenameFileDto, StoredFile } from "@terasandi/contracts";
import { renameFileSchema } from "@terasandi/contracts";
import { DownloadIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { deleteFileAction, renameFileAction } from "@/app/actions/files";
import { TextField } from "@/components/form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { notifyError, notifySuccess } from "@/lib/notify";

/** Download, rename, and delete controls for one file row. */
export function FileRowActions({ file }: { file: StoredFile }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <a
        href={`/api/files/${file.id}/download`}
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        aria-label={`Download ${file.name}`}
        title="Download"
      >
        <DownloadIcon />
      </a>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setRenameOpen(true)}
        aria-label={`Rename ${file.name}`}
        title="Rename"
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setDeleteOpen(true)}
        aria-label={`Delete ${file.name}`}
        title="Delete"
      >
        <Trash2Icon />
      </Button>

      <RenameFileDialog file={file} open={renameOpen} onOpenChange={setRenameOpen} />
      <DeleteFileDialog file={file} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

function RenameFileDialog({
  file,
  open,
  onOpenChange,
}: {
  file: StoredFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formId = `rename-file-${file.id}`;
  const form = useForm<RenameFileDto>({
    mode: "onChange",
    resolver: zodResolver(renameFileSchema),
    defaultValues: { name: file.name },
  });
  const { isValid, isSubmitting } = form.formState;

  async function onSubmit(data: RenameFileDto) {
    const result = await renameFileAction(file.id, data);

    if ("error" in result) {
      notifyError("Could not rename file", result.error);
      return;
    }

    notifySuccess("File renamed", `${file.name} is now ${data.name}.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
          <DialogDescription>
            Give {file.name} a new display name.
          </DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <TextField
              control={form.control}
              name="name"
              label="File name"
              placeholder="report.pdf"
              idPrefix="file"
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form={formId} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFileDialog({
  file,
  open,
  onOpenChange,
}: {
  file: StoredFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, setIsPending] = useState(false);

  async function confirm() {
    setIsPending(true);
    const result = await deleteFileAction(file.id);
    setIsPending(false);

    if ("error" in result) {
      notifyError("Could not delete file", result.error);
      return;
    }

    notifySuccess("File deleted", `${file.name} was removed.`);
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete file</AlertDialogTitle>
          <AlertDialogDescription>
            Delete {file.name} permanently. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={isPending} onClick={confirm}>
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
