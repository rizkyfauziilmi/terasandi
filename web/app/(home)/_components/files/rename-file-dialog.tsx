"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { RenameFileDto, StoredFile } from "@terasandi/contracts";
import { renameFileSchema } from "@terasandi/contracts";
import { useForm } from "react-hook-form";
import { renameFileAction } from "@/app/actions/files";
import { TextField } from "@/components/form";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { notifyError, notifySuccess } from "@/lib/notify";

/** Shared by the row action and the multi-select toolbar. */
export function RenameFileDialog({
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
