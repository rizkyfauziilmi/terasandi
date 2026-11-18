"use server";

import {
  bulkFileIdsSchema,
  fileIdSchema,
  renameFileSchema,
} from "@terasandi/contracts";
import type { BulkFileIdsDto, RenameFileDto } from "@terasandi/contracts";
import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { apiErrorMessage } from "@/lib/api/client";
import { mutateWithSession } from "@/lib/api-authenticated";
import { firstIssue } from "@/lib/forms";

/** The result of a file mutation: either a message to show, or success. */
export type FileActionState = { error: string } | { ok: true };

export async function renameFileAction(
  id: string,
  input: RenameFileDto,
): Promise<FileActionState> {
  const parsedId = fileIdSchema.safeParse(id);

  if (!parsedId.success) {
    return { error: "That file could not be found." };
  }

  return validated(renameFileSchema, input, (data) =>
    mutateWithSession("PATCH", `/files/${parsedId.data}`, data),
  );
}

export async function deleteFileAction(id: string): Promise<FileActionState> {
  const parsed = fileIdSchema.safeParse(id);

  if (!parsed.success) {
    return { error: "That file could not be found." };
  }

  return run(() => mutateWithSession("DELETE", `/files/${parsed.data}`));
}

export async function deleteFilesAction(ids: string[]): Promise<FileActionState> {
  return validated<BulkFileIdsDto>(bulkFileIdsSchema, { ids }, (data) =>
    mutateWithSession("DELETE", "/files", data),
  );
}

async function validated<T>(
  schema: ZodType<T>,
  input: unknown,
  request: (data: T) => Promise<unknown>,
): Promise<FileActionState> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  return run(() => request(parsed.data));
}

/** Applies one mutation as the signed-in user, then refreshes the dashboard. */
async function run(request: () => Promise<unknown>): Promise<FileActionState> {
  try {
    await request();
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }

  revalidatePath("/");
  return { ok: true };
}
