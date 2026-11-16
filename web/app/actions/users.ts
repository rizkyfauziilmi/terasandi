"use server";

import {
  createUserSchema,
  setUserPasswordSchema,
  updateUserRoleSchema,
  updateUsernameSchema,
} from "@terasandi/contracts";
import type {
  CreateUserDto,
  SetUserPasswordDto,
  UpdateUserRoleDto,
  UpdateUsernameDto,
} from "@terasandi/contracts";
import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { requireAdmin } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { mutateWithSession } from "@/lib/api-authenticated";
import { firstIssue } from "@/lib/forms";

const USERS_PATH = "/admin/users";

/** The result of an admin mutation: either a message to show, or success. */
export type UserActionState = { error: string } | { ok: true };

export async function createUserAction(
  input: CreateUserDto,
): Promise<UserActionState> {
  return validated(createUserSchema, input, (data) =>
    mutateWithSession("POST", "/users", data),
  );
}

export async function renameUserAction(
  id: string,
  input: UpdateUsernameDto,
): Promise<UserActionState> {
  return validated(updateUsernameSchema, input, (data) =>
    mutateWithSession("PATCH", `/users/${id}`, data),
  );
}

export async function updateUserRoleAction(
  id: string,
  input: UpdateUserRoleDto,
): Promise<UserActionState> {
  return validated(updateUserRoleSchema, input, (data) =>
    mutateWithSession("PATCH", `/users/${id}/role`, data),
  );
}

export async function resetUserPasswordAction(
  id: string,
  input: SetUserPasswordDto,
): Promise<UserActionState> {
  return validated(setUserPasswordSchema, input, (data) =>
    mutateWithSession("PATCH", `/users/${id}/password`, data),
  );
}

export async function revokeUserSessionsAction(
  id: string,
): Promise<UserActionState> {
  return run(() => mutateWithSession("POST", `/users/${id}/sessions/revoke`));
}

export async function deleteUserAction(id: string): Promise<UserActionState> {
  return run(() => mutateWithSession("DELETE", `/users/${id}`));
}

/** Validates the input against the shared schema, then runs the mutation. */
async function validated<T>(
  schema: ZodType<T>,
  input: unknown,
  request: (data: T) => Promise<unknown>,
): Promise<UserActionState> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  return run(() => request(parsed.data));
}

/**
 * Runs one admin mutation: guards the session, maps API failures to a
 * message, and refreshes the list. The API is the source of truth, so its
 * answer wins over anything checked here.
 */
async function run(request: () => Promise<unknown>): Promise<UserActionState> {
  await requireAdmin();

  try {
    await request();
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(USERS_PATH);
  return { ok: true };
}
