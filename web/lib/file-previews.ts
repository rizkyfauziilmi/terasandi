import {
  FileArchiveIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";

export type FilePreviewKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "text"
  | "file";

export const PREVIEW_ICONS: Record<FilePreviewKind, LucideIcon> = {
  image: ImageIcon,
  video: VideoIcon,
  audio: MusicIcon,
  pdf: FileTextIcon,
  text: FileTextIcon,
  file: FileArchiveIcon,
};

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "heic",
  "heif",
  "bmp",
  "tif",
  "tiff",
  "svg",
  "ico",
  "psd",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "m4v",
  "mov",
  "webm",
  "mkv",
  "avi",
  "mpg",
  "mpeg",
  "wmv",
  "flv",
  "3gp",
  "ogv",
  "ts",
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "opus",
  "flac",
  "m4a",
  "aac",
  "wma",
  "mid",
  "midi",
  "aiff",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "jsonl",
  "csv",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "log",
  "html",
  "htm",
  "css",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "c",
  "h",
  "cpp",
  "cc",
  "cxx",
  "hpp",
  "cs",
  "php",
  "sql",
  "sh",
  "bash",
  "zsh",
  "bat",
  "cmd",
  "command",
  "ps1",
  "vbs",
  "svg",
  "env",
  "gitignore",
]);

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-javascript",
  "application/sql",
  "application/toml",
  "application/x-yaml",
  "application/x-sh",
  "application/x-msdos-batch",
  "application/x-powershell",
]);

const TEXT_PREVIEW_BYTES = 16 * 1024;

/** Chooses a local preview strategy from the browser MIME type or extension. */
export function previewKindFor(file: File): FilePreviewKind {
  const mime = file.type.trim().toLowerCase();
  const ext = extensionOf(file.name);

  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.has(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.has(ext)) {
    return "audio";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (
    mime.startsWith("text/") ||
    TEXT_MIME_TYPES.has(mime) ||
    TEXT_EXTENSIONS.has(ext)
  ) {
    return "text";
  }

  return "file";
}

/** Resolves ambiguous extensions, e.g. TypeScript text vs MPEG-TS bytes. */
export async function resolvePreviewKind(file: File): Promise<FilePreviewKind> {
  const ext = extensionOf(file.name);
  const mime = file.type.trim().toLowerCase();

  if (ext === "ts" && mime === "video/mp2t") {
    const sample = new Uint8Array(await file.slice(0, 512).arrayBuffer());

    return looksLikeUtf8Text(sample) ? "text" : "video";
  }

  return previewKindFor(file);
}

/** Reads only a small prefix so large text files never fill browser memory. */
export async function readTextPreview(
  file: File,
  kind: FilePreviewKind = previewKindFor(file),
): Promise<string | undefined> {
  if (kind !== "text") {
    return undefined;
  }

  const text = await file.slice(0, TEXT_PREVIEW_BYTES).text();

  return text.replace(/\0/g, "").trimEnd();
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");

  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function looksLikeUtf8Text(bytes: Uint8Array): boolean {
  if (bytes.length === 0) {
    return false;
  }

  for (let trailing = 0; trailing <= 3; trailing += 1) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(0, bytes.length - trailing),
      );

      return !bytes.some(
        (byte) =>
          byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d,
      );
    } catch {
      // The sample may end inside a multi-byte character.
    }
  }

  return false;
}
