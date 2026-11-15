"use server";

import { redirect } from "next/navigation";
import { AuthApiError, postAuth } from "@/lib/api";
import type { AuthPath } from "@/lib/api";
import { clearAccessToken, setAccessToken } from "@/lib/session";
import { signInSchema } from "@terasandi/contracts";
import type { SignInDto } from "@terasandi/contracts";
import { signUpFormSchema } from "@/lib/auth-form-schema";
import type { SignUpForm } from "@/lib/auth-form-schema";

export type AuthActionState = { error: string } | undefined;

export async function onboardingAction(
  input: SignUpForm,
): Promise<AuthActionState> {
  const parsed = signUpFormSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { username, password } = parsed.data;
  return authenticate("/auth/onboarding", { username, password });
}

export async function signInAction(
  input: SignInDto,
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
  path: AuthPath,
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
