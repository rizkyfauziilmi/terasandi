"use server";

import { APIError } from "better-auth/api";

import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

export type CreateFirstAdminResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createFirstAdmin(input: {
  email: string;
  username: string;
  password: string;
}): Promise<CreateFirstAdminResult> {
  const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);

  if (existingUser) {
    return { ok: false, error: "Setup is already completed." };
  }

  try {
    const result = await auth.api.createUser({
      body: {
        email: input.email,
        password: input.password,
        name: input.username,
        role: "admin",
        data: {
          emailVerified: true,
          username: input.username,
          displayUsername: input.username,
        },
      },
    });

    if (!result.user) {
      return { ok: false, error: "Failed to create the admin account." };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof APIError) {
      return { ok: false, error: error.message };
    }

    return {
      ok: false,
      error: "Failed to create the admin account. Please try again.",
    };
  }
}
