import {
  FileArchiveIcon,
  FileCodeIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  MusicIcon,
  PresentationIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";

export type FilePreviewKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "text"
  | "markdown"
  | "docx"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "file";

export const PREVIEW_ICONS: Record<FilePreviewKind, LucideIcon> = {
  image: ImageIcon,
  video: VideoIcon,
  audio: MusicIcon,
  pdf: FileTextIcon,
  text: FileCodeIcon,
  markdown: FileCodeIcon,
  docx: FileTextIcon,
  spreadsheet: FileSpreadsheetIcon,
  presentation: PresentationIcon,
  archive: FileArchiveIcon,
  file: FileArchiveIcon,
};

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "bmp",
  "ico",
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "m4v",
  "mov",
  "webm",
  "ogv",
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "opus",
  "m4a",
  "aac",
  "mid",
  "midi",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "json",
  "jsonl",
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
  "dockerfile",
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

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);

const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const SPREADSHEET_EXTENSIONS = new Set(["xlsx", "csv", "tsv"]);

const SPREADSHEET_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "tab-separated-values",
]);

const PRESENTATION_EXTENSIONS = new Set(["pptx"]);
const PRESENTATION_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const ARCHIVE_EXTENSIONS = new Set(["zip", "epub"]);
const ARCHIVE_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
]);

/**
 * Formats that need a native app or can execute active content. They always
 * fall back to metadata + download, even when the browser reports a generic
 * image/video MIME type for them.
 */
const FALLBACK_EXTENSIONS = new Set([
  "heic",
  "heif",
  "tif",
  "tiff",
  "psd",
  "ai",
  "eps",
  "sketch",
  "fig",
  "dwg",
  "dxf",
  "doc",
  "xls",
  "ppt",
  "rtf",
  "odt",
  "ods",
  "odp",
  "rar",
  "7z",
  "mkv",
  "avi",
  "wmv",
  "flv",
  "3gp",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "apk",
  "deb",
  "msi",
  "iso",
  "img",
  "vhd",
  "vmdk",
  "qcow2",
]);

export const TEXT_PREVIEW_BYTES = 16 * 1024;

/** Hard cap for in-browser Office/archive parsing; original files are untouched. */
export const MAX_PREVIEW_BYTES = 25 * 1024 * 1024;

/** The bits of a file needed to choose a preview strategy. */
export interface PreviewMeta {
  name: string;
  type: string;
}

/** Chooses a preview strategy from a MIME type or extension. */
export function previewKindForMeta({ name, type }: PreviewMeta): FilePreviewKind {
  const mime = type.trim().toLowerCase();
  const ext = extensionOf(name);

  if (FALLBACK_EXTENSIONS.has(ext)) {
    return "file";
  }

  if (MARKDOWN_EXTENSIONS.has(ext)) {
    return "markdown";
  }
  if (DOCX_MIME_TYPES.has(mime) || ext === "docx") {
    return "docx";
  }
  if (
    SPREADSHEET_MIME_TYPES.has(mime) ||
    SPREADSHEET_EXTENSIONS.has(ext)
  ) {
    return "spreadsheet";
  }
  if (
    PRESENTATION_MIME_TYPES.has(mime) ||
    PRESENTATION_EXTENSIONS.has(ext)
  ) {
    return "presentation";
  }
  if (ARCHIVE_MIME_TYPES.has(mime) || ARCHIVE_EXTENSIONS.has(ext)) {
    return "archive";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) {
    // SVG may contain scripts; show its source instead of executing it.
    return ext === "svg" || mime === "image/svg+xml" ? "text" : "image";
  }
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.has(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.has(ext)) {
    return "audio";
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

/** Browser `File` adapter for staged uploads. */
export function previewKindFor(file: File): FilePreviewKind {
  return previewKindForMeta(file);
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
  if (kind !== "text" && kind !== "markdown") {
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
