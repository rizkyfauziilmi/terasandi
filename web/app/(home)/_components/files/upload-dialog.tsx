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

  const totalBytes = items.reduce((total, item) => total + item.size, 0);

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
        const previewKind = await resolvePreviewKind(file);
        const previewUrl =
          previewKind === "image" ||
          previewKind === "video" ||
          previewKind === "audio" ||
          previewKind === "pdf"
            ? URL.createObjectURL(file)
            : undefined;

        if (previewUrl) {
          previewUrlsRef.current.add(previewUrl);
        }

        const error = validationError(file, maxFileSize);
        const textPreview =
          previewKind === "text" && !error
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

  function uploadAll() {
    if (items.length === 0) {
      return;
    }

    enqueue(
      items.map((item) => ({
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
              Add files, review them, then upload. Progress and rejected files
              appear in the bottom-right corner.
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

          <DialogFooter>
            <span className="mr-auto text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "file" : "files"} ·{" "}
              {formatBytes(totalBytes)} selected
            </span>

            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>

            <Button
              type="button"
              disabled={items.length === 0}
              onClick={uploadAll}
            >
              <UploadIcon />
              Upload {items.length} {items.length === 1 ? "file" : "files"}
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
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">
            {item?.name ?? "Preview"}
          </DialogTitle>
          <DialogDescription>Preview before upload.</DialogDescription>
        </DialogHeader>
        {item && <FilePreview item={item} />}
      </DialogContent>
    </Dialog>
  );
}

function FilePreview({ item }: { item: StagedFile }) {
  const Icon = PREVIEW_ICONS[item.previewKind];

  if (item.previewKind === "image" && item.previewUrl) {
    return (
      <div className="relative h-[50vh] w-full">
        <Image
          src={item.previewUrl}
          alt={item.name}
          fill
          unoptimized
          sizes="100vw"
          className="object-contain"
        />
      </div>
    );
  }

  if (item.previewKind === "video" && item.previewUrl) {
    return (
      <video
        src={item.previewUrl}
        controls
        className="max-h-[50vh] w-full rounded-md bg-muted"
      />
    );
  }

  if (item.previewKind === "audio" && item.previewUrl) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Icon />
        <audio controls src={item.previewUrl} className="w-full" />
      </div>
    );
  }

  if (item.previewKind === "pdf" && item.previewUrl) {
    return (
      <iframe
        src={item.previewUrl}
        title={`Preview of ${item.name}`}
        className="h-[50vh] w-full rounded-md border"
      />
    );
  }

  if (item.previewKind === "text") {
    return (
      <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
        {item.textPreview || "No text preview available."}
      </pre>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
      <Icon />
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="text-sm">{formatBytes(item.size)}</p>
      <p className="text-xs">{item.file.type || "Unknown type"}</p>
    </div>
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
