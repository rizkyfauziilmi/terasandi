import { z } from "zod";

/** The categories shown on the dashboard and stored on every file. */
export const FILE_CATEGORIES = [
  "document",
  "image",
  "audio",
  "video",
  "other",
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const fileCategorySchema = z.enum(FILE_CATEGORIES);

export const FILE_NAME_MAX_LENGTH = 255;

/** File names are display values: no paths, control characters, or dot names. */
export const fileNameSchema = z
  .string()
  .trim()
  .min(1, "File name is required")
  .max(FILE_NAME_MAX_LENGTH, `File name must be at most ${FILE_NAME_MAX_LENGTH} characters`)
  .refine((name) => !/[\\/\u0000-\u001f\u007f]/.test(name), {
    message: "File name contains invalid characters",
  })
  .refine((name) => name !== "." && name !== "..", {
    message: "File name is invalid",
  });

export const fileSizeSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const fileIdSchema = z.uuid();
export const uploadIdSchema = z.uuid();

/** The body accepted by `POST /files/uploads`. */
export const requestFileUploadSchema = z.object({
  name: fileNameSchema,
  size: fileSizeSchema,
});

/** The body accepted by `POST /files` after the direct upload. */
export const completeFileUploadSchema = z.object({
  uploadId: uploadIdSchema,
  name: fileNameSchema,
});

/** The body accepted by `PATCH /files/:id`. */
export const renameFileSchema = z.object({
  name: fileNameSchema,
});

export type RequestFileUploadDto = z.infer<typeof requestFileUploadSchema>;
export type CompleteFileUploadDto = z.infer<typeof completeFileUploadSchema>;
export type RenameFileDto = z.infer<typeof renameFileSchema>;

/**
 * A short-lived, direct-to-storage upload. `headers` must be sent with the
 * `PUT`; the browser sets `Content-Length` itself.
 */
export interface FileUploadTicket {
  uploadId: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
  maxSize: number;
}

/** A file as it appears over JSON: dates are ISO strings, not `Date`. */
export interface StoredFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  createdAt: string;
  updatedAt: string;
}

/** `GET /files`: the user's own files plus per-category totals. */
export interface FilesResponse {
  files: StoredFile[];
  totals: Record<FileCategory, number>;
  totalSize: number;
  maxFileSize: number;
}

/** A short-lived link to the private object. */
export interface DownloadUrl {
  url: string;
  expiresAt: string;
}
