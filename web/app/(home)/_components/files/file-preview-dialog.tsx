"use client";

import type { StoredFile } from "@terasandi/contracts";
import { FilePreviewContent } from "@/components/files/file-preview-content";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import { previewKindForMeta } from "@/lib/file-previews";

/** Stored-file adapter: the preview is streamed through the session route. */
export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
}: {
  file: StoredFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const url = `/api/files/${file.id}/preview`;
  const kind = previewKindForMeta({ name: file.name, type: file.mimeType });

  return (
    <FilePreviewModal
      open={open}
      onOpenChange={onOpenChange}
      name={file.name}
      size={file.size}
      mimeType={file.mimeType}
    >
      <FilePreviewContent
        active={open}
        name={file.name}
        kind={kind}
        mediaUrl={url}
        textUrl={url}
        size={file.size}
        mimeType={file.mimeType}
      />
    </FilePreviewModal>
  );
}
