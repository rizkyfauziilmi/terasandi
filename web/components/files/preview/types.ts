import { MAX_PREVIEW_BYTES, TEXT_PREVIEW_BYTES } from "@/lib/file-previews";

/** Normalized input for every preview renderer. */
export interface PreviewSource {
  name: string;
  size?: number;
  mimeType?: string;
  /** Local staged upload, read directly in the browser. */
  file?: File;
  /** Object URL for staged files or the session-protected route for stored files. */
  url?: string;
  /** Prefix already read from a local text/markdown file. */
  text?: string;
  active: boolean;
}

export interface PreviewRendererProps extends PreviewSource {
  onError: () => void;
}

/** Heavy parsers never load more than this, regardless of the real file size. */
export function previewTooLarge(source: PreviewSource): boolean {
  return source.size !== undefined && source.size > MAX_PREVIEW_BYTES;
}

/** Reads a bounded prefix from either a local File or a streamed URL. */
export async function readPreviewBytes(
  source: PreviewSource,
  signal: AbortSignal,
  limit = MAX_PREVIEW_BYTES,
): Promise<Uint8Array> {
  if (source.file) {
    return new Uint8Array(await source.file.slice(0, limit).arrayBuffer());
  }

  if (!source.url) {
    throw new Error("No preview source available");
  }

  const response = await fetch(source.url, { signal });

  if (!response.ok || !response.body) {
    throw new Error("Could not load preview");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (length < limit) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const slice = value.subarray(0, limit - length);
    chunks.push(slice);
    length += slice.length;

    if (slice.length < value.length) {
      break;
    }
  }

  await reader.cancel().catch(() => undefined);

  const merged = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

/** Decodes a bounded UTF-8 prefix without keeping the whole file in memory. */
export async function readPreviewText(
  source: PreviewSource,
  signal: AbortSignal,
): Promise<string> {
  if (source.text !== undefined) {
    return source.text;
  }

  const bytes = await readPreviewBytes(
    source,
    signal,
    TEXT_PREVIEW_BYTES,
  );

  return new TextDecoder().decode(bytes).replace(/\0/g, "").trimEnd();
}
