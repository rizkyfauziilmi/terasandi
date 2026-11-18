"use server";

import { redirect } from "next/navigation";
import { postAuth, revokeSession } from "@/lib/api/auth";
import type { AuthPath } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/client";
import {
  clearAuthCookies,
  getRefreshToken,
  setAuthCookies,
} from "@/lib/session";
import { signInSchema } from "@terasandi/contracts";
import type { SignInDto } from "@terasandi/contracts";
import { signUpFormSchema } from "@/lib/auth-form-schema";
import type { SignUpForm } from "@/lib/auth-form-schema";
import { firstIssue } from "@/lib/forms";

export type AuthActionState = { error: string } | undefined;

export async function onboardingAction(
  input: SignUpForm,
): Promise<AuthActionState> {
  const parsed = signUpFormSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  const { username, password } = parsed.data;
  return authenticate("/auth/onboarding", { username, password });
}

export async function signInAction(input: SignInDto): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return { error: firstIssue(parsed.error) };
  }

  return authenticate("/auth/sign-in", parsed.data);
}

export async function signOutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();

  if (refreshToken && !(await revokeSession(refreshToken))) {
    // Best effort: the local session still ends, but the token stays valid
    // server-side until it expires, so the failure is at least recorded.
    console.error(
      "Sign-out: the API did not revoke the refresh token; it will expire on its own.",
    );
  }

  await clearAuthCookies();
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
    return { error: apiErrorMessage(error) };
  }

  await setAuthCookies(response);
  redirect("/");
}
