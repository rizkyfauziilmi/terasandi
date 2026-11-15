"use server";

import { redirect } from "next/navigation";
import { AuthApiError, postAuth } from "@/lib/api";
import { clearAccessToken, setAccessToken } from "@/lib/session";
import { signInSchema, signUpSchema } from "@/schemas/auth.schema";
import type { SignInSchema, SignUpSchema } from "@/schemas/auth.schema";

export type AuthActionState = { error: string } | undefined;

export async function onboardingAction(
  input: SignUpSchema,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { username, password } = parsed.data;
  return authenticate("/auth/onboarding", { username, password });
}

export async function signInAction(
  input: SignInSchema,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  return authenticate("/auth/sign-in", parsed.data);
}

export async function signOutAction(): Promise<void> {
  await clearAccessToken();
  redirect("/sign-in");
}

async function authenticate(
  path: "/auth/onboarding" | "/auth/sign-in",
  credentials: { username: string; password: string },
): Promise<AuthActionState> {
  let response;

  try {
    response = await postAuth(path, credentials);
  } catch (error) {
    return {
      error:
        error instanceof AuthApiError
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }

  await setAccessToken(response.accessToken, response.expiresIn);
  redirect("/");
}
