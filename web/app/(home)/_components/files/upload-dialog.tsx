"use client";

import {
  EyeIcon,
  FileUpIcon,
  PlusIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FilePreviewContent } from "@/components/files/file-preview-content";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import { useUploadActions } from "@/components/upload/upload-provider";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
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
import { formatBytes } from "@/lib/files";
import {
  PREVIEW_ICONS,
  previewKindFor,
  readTextPreview,
  resolvePreviewKind,
  type FilePreviewKind,
} from "@/lib/file-previews";

type StagedStatus = "idle" | "error";

interface StagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: StagedStatus;
  error?: string;
  previewUrl?: string;
  previewKind: FilePreviewKind;
  textPreview?: string;
}

interface UploadDialogProps {
  maxFileSize: number;
}

/** Stages and previews files locally, then hands all of them to the global queue. */
export function UploadDialog({ maxFileSize }: UploadDialogProps) {
  const { enqueue } = useUploadActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StagedFile[]>([]);
  const [previewItem, setPreviewItem] = useState<StagedFile | null>(null);

  useEffect(
    () => () => {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current.clear();
    },
    [],
  );

  const readyItems = items.filter((item) => !item.error);
  const rejectedItems = items.filter((item) => item.error);
  const totalBytes = readyItems.reduce((total, item) => total + item.size, 0);

  function revokePreviewUrl(url: string | undefined) {
    if (!url) {
      return;
    }
    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  }

  function reset() {
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current.clear();
    setItems([]);
    setPreviewItem(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);

    if (files.length === 0) {
      return;
    }

    const prepared = await Promise.all(
      files.map(async (file): Promise<StagedFile> => {
        const error = validationError(file, maxFileSize);
        const previewKind = error
          ? previewKindFor(file)
          : await resolvePreviewKind(file);
        const previewUrl =
          !error &&
          (previewKind === "image" ||
            previewKind === "video" ||
            previewKind === "audio" ||
            previewKind === "pdf")
            ? URL.createObjectURL(file)
            : undefined;

        if (previewUrl) {
          previewUrlsRef.current.add(previewUrl);
        }

        const textPreview =
          !error && (previewKind === "text" || previewKind === "markdown")
            ? await readTextPreview(file, previewKind)
            : undefined;

        return {
          id: newId(),
          file,
          name: file.name,
          size: file.size,
          status: error ? "error" : "idle",
          error,
          previewUrl,
          previewKind,
          textPreview,
        };
      }),
    );

    setItems((current) => [...current, ...prepared]);
  }

  async function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    event.target.value = "";

    if (files) {
      await addFiles(files);
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void addFiles(event.dataTransfer.files);
  }

  function removeItem(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    revokePreviewUrl(item?.previewUrl);
    setItems((current) => current.filter((candidate) => candidate.id !== id));
    if (previewItem?.id === id) {
      setPreviewItem(null);
    }
  }

  function removeRejected() {
    for (const item of rejectedItems) {
      revokePreviewUrl(item.previewUrl);
    }
    setItems((current) => current.filter((item) => !item.error));
    if (previewItem?.error) {
      setPreviewItem(null);
    }
  }

  function uploadAll() {
    if (readyItems.length === 0 || rejectedItems.length > 0) {
      return;
    }

    enqueue(
      readyItems.map((item) => ({
        id: item.id,
        file: item.file,
        name: item.name,
        size: item.size,
        previewKind: item.previewKind,
        error: item.error,
      })),
    );

    setOpen(false);
    reset();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UploadIcon />
        Upload files
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
            <DialogDescription>
              Add files, review them, then upload. Rejected files stay here and
              are not queued; progress appears in the bottom-right corner.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => void onSelect(event)}
          />

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center"
          >
            <FileUpIcon className="text-muted-foreground" />
            <p className="text-sm font-medium">Drop files here</p>
            <p className="text-xs text-muted-foreground">
              Each file must be between 1 B and {formatBytes(maxFileSize)}.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <PlusIcon />
              Add files
            </Button>
          </div>

          {items.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Selected files
              </p>
              <AttachmentGroup className="max-h-72 flex-col overflow-y-auto overscroll-y-contain">
                {items.map((item) => (
                  <StagedAttachment
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onPreview={setPreviewItem}
                  />
                ))}
              </AttachmentGroup>
            </div>
          )}

          {rejectedItems.length > 0 && (
            <p className="text-xs text-destructive">
              {rejectedItems.length}{" "}
              {rejectedItems.length === 1 ? "file can't" : "files can't"} be uploaded.
              Remove {rejectedItems.length === 1 ? "it" : "them"} to continue.
            </p>
          )}

          <DialogFooter>
            <span className="mr-auto text-xs text-muted-foreground">
              {readyItems.length} {readyItems.length === 1 ? "file" : "files"} ·{" "}
              {formatBytes(totalBytes)} ready
              {rejectedItems.length > 0 && ` · ${rejectedItems.length} rejected`}
            </span>

            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>

            {rejectedItems.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={removeRejected}>
                Remove rejected
              </Button>
            )}

            <Button
              type="button"
              disabled={readyItems.length === 0 || rejectedItems.length > 0}
              onClick={uploadAll}
            >
              <UploadIcon />
              Upload {readyItems.length} {readyItems.length === 1 ? "file" : "files"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviewDialog
        item={previewItem}
        onOpenChange={(next) => {
          if (!next) {
            setPreviewItem(null);
          }
        }}
      />
    </>
  );
}

interface StagedAttachmentProps {
  item: StagedFile;
  onRemove: (id: string) => void;
  onPreview: (item: StagedFile) => void;
}

function StagedAttachment({ item, onRemove, onPreview }: StagedAttachmentProps) {
  const Icon = PREVIEW_ICONS[item.previewKind];

  return (
    <Attachment state={item.status} className="w-full">
      {item.previewKind === "image" && item.previewUrl ? (
        <AttachmentMedia variant="image">
          <Image
            src={item.previewUrl}
            alt=""
            fill
            unoptimized
            sizes="40px"
            className="object-cover"
          />
        </AttachmentMedia>
      ) : item.previewKind === "video" && item.previewUrl ? (
        <AttachmentMedia variant="image">
          <video
            src={`${item.previewUrl}#t=0.1`}
            muted
            preload="metadata"
            className="size-full object-cover"
          />
        </AttachmentMedia>
      ) : (
        <AttachmentMedia>
          <Icon />
        </AttachmentMedia>
      )}

      <AttachmentContent>
        <AttachmentTitle>{item.name}</AttachmentTitle>
        <AttachmentDescription>
          {item.status === "idle" ? "Ready" : (item.error ?? "Invalid file")} ·{" "}
          {formatBytes(item.size)}
        </AttachmentDescription>

        {item.previewKind === "audio" && item.previewUrl && (
          <audio controls src={item.previewUrl} className="mt-1 h-7 w-full" />
        )}

        {item.textPreview && (
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {item.textPreview.split("\n")[0] || "Empty preview"}
          </span>
        )}
      </AttachmentContent>

      <AttachmentActions>
        <AttachmentAction
          title="Preview"
          aria-label={`Preview ${item.name}`}
          onClick={() => onPreview(item)}
        >
          <EyeIcon />
        </AttachmentAction>
        <AttachmentAction
          title="Remove"
          aria-label={`Remove ${item.name}`}
          onClick={() => onRemove(item.id)}
        >
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}

interface PreviewDialogProps {
  item: StagedFile | null;
  onOpenChange: (open: boolean) => void;
}

function PreviewDialog({ item, onOpenChange }: PreviewDialogProps) {
  return (
    <FilePreviewModal
      open={item !== null}
      onOpenChange={onOpenChange}
      name={item?.name ?? "Preview"}
      size={item?.size}
      mimeType={item?.file.type}
    >
      {item && (
        <FilePreviewContent
          name={item.name}
          kind={item.previewKind}
          file={item.file}
          url={item.previewUrl}
          text={
            item.previewKind === "text" || item.previewKind === "markdown"
              ? (item.textPreview ?? "")
              : undefined
          }
          size={item.size}
          mimeType={item.file.type}
        />
      )}
    </FilePreviewModal>
  );
}

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function validationError(file: File, maxFileSize: number): string | undefined {
  if (file.size === 0) {
    return "File is empty.";
  }
  if (file.size > maxFileSize) {
    return `Larger than ${formatBytes(maxFileSize)}.`;
  }

  return undefined;
}
