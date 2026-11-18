"use client";

import { TriangleAlertIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  PREVIEW_ICONS,
  TEXT_PREVIEW_BYTES,
  type FilePreviewKind,
} from "@/lib/file-previews";
import { formatBytes } from "@/lib/files";

/**
 * Shared preview renderer. Callers only adapt their source:
 * a local object URL and pre-read text, or a session-protected stream URL.
 */
export interface FilePreviewContentProps {
  name: string;
  kind: FilePreviewKind;
  mediaUrl?: string;
  /** Already loaded text, used by locally staged files. */
  text?: string;
  /** URL to stream a text prefix from, used by stored files. */
  textUrl?: string;
  mimeType?: string;
  size?: number;
  active?: boolean;
}

export function FilePreviewContent({
  name,
  kind,
  mediaUrl,
  text,
  textUrl,
  mimeType,
  size,
  active = true,
}: FilePreviewContentProps) {
  const [failed, setFailed] = useState(false);
  const Icon = PREVIEW_ICONS[kind];

  if (failed) {
    return <Unavailable message="This file could not be previewed." />;
  }

  switch (kind) {
    case "image":
      if (!mediaUrl) {
        return <Unavailable message="Preview isn't available for this file." />;
      }
      return (
        <div className="relative h-[50vh] w-full">
          <Image
            src={mediaUrl}
            alt={name}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
            onError={() => setFailed(true)}
          />
        </div>
      );
    case "video":
      if (!mediaUrl) {
        return <Unavailable message="Preview isn't available for this file." />;
      }
      return (
        <video
          src={mediaUrl}
          controls
          className="max-h-[50vh] w-full rounded-md bg-muted"
          onError={() => setFailed(true)}
        />
      );
    case "audio":
      if (!mediaUrl) {
        return <Unavailable message="Preview isn't available for this file." />;
      }
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Icon className="size-10 text-muted-foreground" />
          <audio
            src={mediaUrl}
            controls
            className="w-full"
            onError={() => setFailed(true)}
          />
        </div>
      );
    case "pdf":
      if (!mediaUrl) {
        return <Unavailable message="Preview isn't available for this file." />;
      }
      return (
        <iframe
          src={mediaUrl}
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
      if (textUrl) {
        return <StreamedTextPreview url={textUrl} active={active} />;
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

function StreamedTextPreview({ url, active }: { url: string; active: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok || !response.body) {
          throw new Error("Preview unavailable");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let output = "";
        let bytes = 0;

        while (bytes < TEXT_PREVIEW_BYTES) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const slice = value.subarray(0, TEXT_PREVIEW_BYTES - bytes);
          output += decoder.decode(slice, { stream: true });
          bytes += slice.length;

          if (slice.length < value.length) {
            break;
          }
        }

        output += decoder.decode();
        await reader.cancel().catch(() => undefined);

        if (!controller.signal.aborted) {
          setText(output.replace(/\0/g, "").trimEnd());
        }
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [url, active]);

  if (failed) {
    return <Unavailable message="This file could not be previewed." />;
  }

  if (text === null) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Loading preview…
      </p>
    );
  }

  return (
    <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
      {text || "No text preview available."}
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
