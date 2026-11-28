"use server";

import * as z from "zod";

import { auth } from "@/lib/auth";

export type ResendVerificationEmailResult =
  { ok: true } | { ok: false; error: string };

export async function resendVerificationEmail(
  email: string,
): Promise<ResendVerificationEmailResult> {
  const parsed = z.email().safeParse(email);

  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  // Build the callback server-side so clients cannot inject a redirect target.
  const callbackURL = `/onboarding/verify?email=${encodeURIComponent(parsed.data)}`;

  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: parsed.data,
        callbackURL,
      },
    });

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Failed to send the verification email. Please try again.",
    };
  }
}
