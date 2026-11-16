import type { ZodError } from "zod";

/** The first message a failed parse produced, or a generic fallback. */
export function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
