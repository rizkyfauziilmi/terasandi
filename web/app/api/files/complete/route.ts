import { completeFileUploadSchema } from "@terasandi/contracts";
import type { CompleteFileUploadDto, StoredFile } from "@terasandi/contracts";
import { revalidatePath } from "next/cache";
import { readJsonBody, routeErrorResponse } from "@/lib/api/route";
import { fetchWithSession } from "@/lib/api-authenticated";
import { firstIssue } from "@/lib/forms";

/** Records an upload after the API has checked its bytes and type. */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);

  if (!body.ok) {
    return Response.json({ message: body.message }, { status: 400 });
  }

  const parsed = completeFileUploadSchema.safeParse(body.value);

  if (!parsed.success) {
    return Response.json({ message: firstIssue(parsed.error) }, { status: 400 });
  }

  try {
    const file = await fetchWithSession<StoredFile>("/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data satisfies CompleteFileUploadDto),
    });
    revalidatePath("/");

    return Response.json(file, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
