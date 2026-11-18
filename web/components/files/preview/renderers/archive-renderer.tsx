"use client";

import type { Unzip as UnzipStream } from "fflate";
import { useEffect, useRef, useState } from "react";
import { PreviewEmpty, PreviewLoading } from "../preview-status";
import { readPreviewBytes, type PreviewRendererProps } from "../types";

const ENTRY_LIMIT = 1024 * 1024;
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
};

interface ArchiveEntry {
  name: string;
  size: number;
}

interface EntryPreview {
  key: string;
  text: string | null;
  url: string | null;
}

/** Lists a ZIP without decompressing it; only the selected entry is expanded. */
export default function ArchiveRenderer({
  active,
  file,
  name,
  url,
  onError,
}: PreviewRendererProps) {
  const [archiveBytes, setArchiveBytes] = useState<Uint8Array | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [entryPreview, setEntryPreview] = useState<EntryPreview | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const bytes = await readPreviewBytes(
          { name, file, url, active },
          controller.signal,
        );
        const list = await listEntries(bytes);

        if (!controller.signal.aborted) {
          setArchiveBytes(bytes);
          setEntries(list);
          setSelected(list[0]?.name ?? null);
        }
      } catch {
        if (!controller.signal.aborted) {
          onError();
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [active, file, name, onError, url]);

  useEffect(() => {
    if (!active || !archiveBytes || !selected) {
      return;
    }

    const entry = entries?.find((candidate) => candidate.name === selected);

    if (!entry || entry.size > ENTRY_LIMIT) {
      return;
    }

    const controller = new AbortController();
    const key = selected;
    const ext = extensionOf(key);
    const imageType = IMAGE_MIME[ext];

    async function loadEntry() {
      try {
        const bytes = await readEntry(archiveBytes!, key, controller.signal);
        if (controller.signal.aborted) {
          return;
        }

        if (imageType) {
          const objectUrl = URL.createObjectURL(
            new Blob([bytes.buffer as ArrayBuffer], { type: imageType }),
          );
          objectUrlRef.current = objectUrl;
          setEntryPreview({ key, text: null, url: objectUrl });
        } else {
          setEntryPreview({
            key,
            text: new TextDecoder().decode(bytes).replace(/\0/g, "").trimEnd(),
            url: null,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          onError();
        }
      }
    }

    void loadEntry();
    return () => {
      controller.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [active, archiveBytes, entries, onError, selected]);

  if (entries === null) {
    return <PreviewLoading label="Reading archive…" />;
  }

  if (entries.length === 0) {
    return <PreviewEmpty label="This archive is empty." />;
  }

  const current = entries.find((entry) => entry.name === selected);
  const resolved = entryPreview?.key === selected ? entryPreview : null;

  return (
    <div className="space-y-3">
      <div className="max-h-32 overflow-auto rounded-md border">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="px-2 py-1 font-medium">Entry</th>
              <th className="px-2 py-1 text-right font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.name}
                className={
                  entry.name === selected
                    ? "cursor-pointer bg-accent"
                    : "cursor-pointer even:bg-muted/40"
                }
                onClick={() => setSelected(entry.name)}
              >
                <td className="max-w-[24rem] truncate px-2 py-1" title={entry.name}>
                  {entry.name}
                </td>
                <td className="px-2 py-1 text-right">{formatBytes(entry.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {current && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{current.name}</p>
          {current.size > ENTRY_LIMIT ? (
            <PreviewEmpty label="This entry is too large to preview inline." />
          ) : resolved?.url ? (
            <div className="relative h-[40vh] w-full">
              {/* Plain img is fine here: the source is a local blob of an archive entry. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolved.url}
                alt={current.name}
                className="h-full w-full object-contain"
              />
            </div>
          ) : resolved?.text !== null && resolved?.text !== undefined ? (
            <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
              {resolved.text || "This entry is empty."}
            </pre>
          ) : (
            <PreviewLoading label="Reading entry…" />
          )}
        </div>
      )}
    </div>
  );
}

async function listEntries(bytes: Uint8Array): Promise<ArchiveEntry[]> {
  const { Unzip, UnzipInflate } = await import("fflate");
  const entries: ArchiveEntry[] = [];
  const unzipper: UnzipStream = new Unzip((file) => {
    if (!file.name.endsWith("/")) {
      entries.push({
        name: file.name,
        size: file.originalSize ?? 0,
      });
    }
    file.ondata = () => undefined;
    file.terminate();
  });
  unzipper.register(UnzipInflate);
  unzipper.push(bytes, true);

  return entries;
}

async function readEntry(
  bytes: Uint8Array,
  target: string,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const { Unzip, UnzipInflate } = await import("fflate");

  return new Promise<Uint8Array>((resolve, reject) => {
    if (signal.aborted) {
      resolve(new Uint8Array());
      return;
    }

    const chunks: Uint8Array[] = [];
    let length = 0;
    let settled = false;
    let found = false;

    const finish = (data?: Uint8Array) => {
      if (settled) {
        return;
      }
      settled = true;
      if (data) {
        const merged = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(merged);
      } else {
        resolve(new Uint8Array());
      }
    };

    const unzipper: UnzipStream = new Unzip((file) => {
      if (file.name !== target) {
        file.ondata = () => undefined;
        file.terminate();
        return;
      }

      found = true;
      file.ondata = (error, data, final) => {
        if (error || signal.aborted) {
          reject(error ?? new Error("Preview cancelled"));
          return;
        }

        const slice = data.subarray(0, ENTRY_LIMIT - length);
        if (slice.length > 0) {
          chunks.push(slice);
          length += slice.length;
        }

        if (final || length >= ENTRY_LIMIT) {
          file.terminate();
          finish();
        }
      };
      file.start();
    });
    unzipper.register(UnzipInflate);
    unzipper.push(bytes, true);

    if (!found && !settled) {
      finish();
    }
  });
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");

  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
