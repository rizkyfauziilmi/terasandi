"use client";

import type { StoredFile } from "@terasandi/contracts";
import {
  DownloadIcon,
  FileArchiveIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  PencilIcon,
  Trash2Icon,
  VideoIcon,
} from "lucide-react";
import { useState } from "react";
import { deleteFilesAction } from "@/app/actions/files";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { FILE_CATEGORY_LABELS, formatBytes, formatDate } from "@/lib/files";
import { notifyError, notifySuccess } from "@/lib/notify";
import { FileRowActions } from "./file-row-actions";
import { RenameFileDialog } from "./rename-file-dialog";

const CATEGORY_ICONS: Record<StoredFile["category"], typeof FileTextIcon> = {
  document: FileTextIcon,
  image: ImageIcon,
  audio: MusicIcon,
  video: VideoIcon,
  other: FileArchiveIcon,
};

/** The user's files, newest first, with checkbox selection and bulk actions. */
export function FileList({ files }: { files: StoredFile[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedFiles = files.filter((file) => selectedIds.has(file.id));
  const allSelected = files.length > 0 && selectedFiles.length === files.length;
  const renameTarget = selectedFiles.length === 1 ? selectedFiles[0] : null;

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const file of files) {
        if (allSelected) {
          next.delete(file.id);
        } else {
          next.add(file.id);
        }
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function confirmDelete() {
    const ids = selectedFiles.map((file) => file.id);
    if (ids.length === 0) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteFilesAction(ids);
    setIsDeleting(false);

    if ("error" in result) {
      notifyError("Could not delete files", result.error);
      return;
    }

    notifySuccess(
      "Files deleted",
      `${ids.length} ${ids.length === 1 ? "file was" : "files were"} removed.`,
    );
    setDeleteOpen(false);
    clearSelection();
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label="Select all files"
          />
          <span className="text-sm font-medium">
            {selectedFiles.length} selected
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
            Clear
          </Button>

          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!renameTarget}
              onClick={() => setRenameOpen(true)}
            >
              <PencilIcon />
              Rename
            </Button>

            <form action="/api/files/archive" method="post">
              {selectedFiles.map((file) => (
                <input key={file.id} type="hidden" name="ids" value={file.id} />
              ))}
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={selectedFiles.length < 2}
                title={
                  selectedFiles.length < 2
                    ? "Select at least two files to download as ZIP"
                    : undefined
                }
              >
                <DownloadIcon />
                Download ZIP
              </Button>
            </form>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              Delete
            </Button>
          </div>
        </div>
      )}

      <ItemGroup className="gap-2">
        {files.map((file) => {
          const Icon = CATEGORY_ICONS[file.category];
          const selected = selectedIds.has(file.id);

          return (
            <Item
              key={file.id}
              variant={selected ? "muted" : "outline"}
              className={selected ? "ring-1 ring-primary/40" : undefined}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={() => toggle(file.id)}
                aria-label={`Select ${file.name}`}
              />
              <ItemMedia variant="icon">
                <Icon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{file.name}</ItemTitle>
                <ItemDescription>
                  {FILE_CATEGORY_LABELS[file.category]} · {formatBytes(file.size)} ·{" "}
                  {formatDate(file.createdAt)}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="ml-auto">
                <FileRowActions file={file} />
              </ItemActions>
            </Item>
          );
        })}
      </ItemGroup>

      {renameTarget && (
        <RenameFileDialog
          file={renameTarget}
          open={renameOpen}
          onOpenChange={setRenameOpen}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete files</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {selectedFiles.length}{" "}
              {selectedFiles.length === 1 ? "file" : "files"} permanently. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
