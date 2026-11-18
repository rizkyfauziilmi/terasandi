import { ApiError } from "./client";

/** Turns an API failure into the `{ message }` body browser helpers expect. */
export function routeErrorResponse(error: unknown): Response {
  const status = error instanceof ApiError && error.status > 0 ? error.status : 500;
  const message =
    error instanceof ApiError
      ? error.message
      : "Something went wrong. Please try again.";

  return Response.json({ message }, { status });
}

/** Reads and validates a JSON route body, returning its first error message. */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, message: "Invalid request body." };
  }
}
