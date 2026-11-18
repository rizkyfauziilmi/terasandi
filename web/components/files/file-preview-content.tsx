"use client";

import { TriangleAlertIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { HeavyRenderer } from "@/components/files/preview/registry";
import {
  PreviewEmpty,
  PreviewLoading,
} from "@/components/files/preview/preview-status";
import {
  previewTooLarge,
  readPreviewText,
  type PreviewSource,
} from "@/components/files/preview/types";
import {
  MAX_PREVIEW_BYTES,
  PREVIEW_ICONS,
  type FilePreviewKind,
} from "@/lib/file-previews";
import { formatBytes } from "@/lib/files";

const PARSED_KINDS = new Set<FilePreviewKind>([
  "docx",
  "spreadsheet",
  "presentation",
  "archive",
]);
const LAZY_KINDS = new Set<FilePreviewKind>([...PARSED_KINDS, "markdown"]);

/** Normalized props: callers choose only where the bytes come from. */
export interface FilePreviewContentProps {
  name: string;
  kind: FilePreviewKind;
  file?: File;
  url?: string;
  text?: string;
  mimeType?: string;
  size?: number;
  active?: boolean;
}

export function FilePreviewContent({
  name,
  kind,
  file,
  url,
  text,
  mimeType,
  size,
  active = true,
}: FilePreviewContentProps) {
  const sourceKey = `${kind}:${name}:${url ?? ""}:${file?.name ?? ""}`;
  const [failureKey, setFailureKey] = useState<string | null>(null);
  const handleError = useCallback(
    () => setFailureKey(sourceKey),
    [sourceKey],
  );
  const failed = failureKey === sourceKey;
  const source: PreviewSource = {
    name,
    file,
    url,
    text,
    mimeType,
    size,
    active,
  };

  if (failed) {
    return <Unavailable message="This file could not be previewed." />;
  }

  if (PARSED_KINDS.has(kind) && previewTooLarge(source)) {
    return (
      <Unavailable
        message={`Preview is limited to ${formatBytes(MAX_PREVIEW_BYTES)}. Download the file to view it.`}
      />
    );
  }

  if (LAZY_KINDS.has(kind)) {
    return <HeavyRenderer kind={kind} {...source} onError={handleError} />;
  }

  const Icon = PREVIEW_ICONS[kind];

  switch (kind) {
    case "image":
      if (!url) {
        return <Unavailable message="Preview isn't available for this file." />;
      }
      return (
        <div className="relative h-[50vh] w-full">
          <Image
            src={url}
            alt={name}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
            onError={handleError}
          />
        </div>
      );
    case "video":
      if (!url) {
        return <Unavailable message="Preview isn't available for this file." />;
      }
      return (
        <video
          src={url}
          controls
          className="max-h-[50vh] w-full rounded-md bg-muted"
          onError={handleError}
        />
      );
    case "audio":
      if (!url) {
        return <Unavailable message="Preview isn't available for this file." />;
      }
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Icon className="size-10 text-muted-foreground" />
          <audio
            src={url}
            controls
            className="w-full"
            onError={handleError}
          />
        </div>
      );
    case "pdf":
      if (!url) {
        return <Unavailable message="Preview isn't available for this file." />;
      }
      return (
        <iframe
          src={url}
          title={`Preview of ${name}`}
          className="h-[50vh] w-full rounded-md border"
        />
      );
    case "text":
      if (text !== undefined) {
        return (
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
            {text || "No text preview available."}
          </pre>
        );
      }
      if (url) {
        return (
          <TextPreview
            name={name}
            file={file}
            text={text}
            url={url}
            active={active}
            onError={handleError}
          />
        );
      }
      return <Unavailable message="Preview isn't available for this file." />;
    default:
      return (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <Icon className="size-10" />
          <p className="font-medium text-foreground">{name}</p>
          {size !== undefined && <p className="text-sm">{formatBytes(size)}</p>}
          {mimeType && <p className="text-xs">{mimeType}</p>}
          <p className="text-sm">
            No inline preview available for this file type.
          </p>
        </div>
      );
  }
}

function TextPreview({
  name,
  file,
  text,
  url,
  active,
  onError,
}: {
  name: string;
  file?: File;
  text?: string;
  url: string;
  active: boolean;
  onError: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const value = await readPreviewText(
          { name, file, text, url, active },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setContent(value);
        }
      } catch {
        if (!controller.signal.aborted) {
          onError();
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [active, file, name, onError, text, url]);

  if (content === null) {
    return <PreviewLoading />;
  }

  if (!content.trim()) {
    return <PreviewEmpty label="No text preview available." />;
  }

  return (
    <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
      {content}
    </pre>
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
      <TriangleAlertIcon className="size-10" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
