import { requestFileUploadSchema } from "@terasandi/contracts";
import type { FileUploadTicket, RequestFileUploadDto } from "@terasandi/contracts";
import { fetchWithSession } from "@/lib/api-authenticated";
import { firstIssue } from "@/lib/forms";
import { readJsonBody, routeErrorResponse } from "@/lib/api/route";

/** Asks the API for a short-lived, direct-to-MinIO PUT URL. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);

  if (!body.ok) {
    return Response.json({ message: body.message }, { status: 400 });
  }

  const parsed = requestFileUploadSchema.safeParse(body.value);

  if (!parsed.success) {
    return Response.json({ message: firstIssue(parsed.error) }, { status: 400 });
  }

  try {
    const ticket = await fetchWithSession<FileUploadTicket>("/files/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data satisfies RequestFileUploadDto),
    });

    return Response.json(ticket, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
