"use client";

import type { StoredFile } from "@terasandi/contracts";
import {
  DownloadIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { deleteFileAction } from "@/app/actions/files";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notifyError, notifySuccess } from "@/lib/notify";
import { FilePreviewDialog } from "./file-preview-dialog";
import { RenameFileDialog } from "./rename-file-dialog";

/** Preview button plus an actions dropdown for one file row. */
export function FileRowActions({ file }: { file: StoredFile }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPreviewOpen(true)}
          aria-label={`Preview ${file.name}`}
          title="Preview"
        >
          <EyeIcon />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${file.name}`}
                title="More actions"
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem render={<a href={`/api/files/${file.id}/download`} />}>
              <DownloadIcon />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
              <PencilIcon />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FilePreviewDialog
        file={file}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
      <RenameFileDialog file={file} open={renameOpen} onOpenChange={setRenameOpen} />
      <DeleteFileDialog file={file} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
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
