import type { FileCategory } from "@terasandi/contracts";

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** A compact size for the dashboard, e.g. `1.4 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${UNITS[unit]}`;
}

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  document: "Documents",
  image: "Images",
  audio: "Audio",
  video: "Videos",
  other: "Other",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** A stable, server-safe date for the file list. */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
