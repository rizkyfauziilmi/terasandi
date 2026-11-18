import { bulkFileIdsSchema } from "@terasandi/contracts";
import { ApiError } from "@/lib/api/client";
import { routeErrorResponse } from "@/lib/api/route";
import { fetchWithSessionResponse } from "@/lib/api-authenticated";

/** Streams a ZIP of the selected files from the API to the browser. */
export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const ids = form
      .getAll("ids")
      .filter((value): value is string => typeof value === "string");
    const parsed = bulkFileIdsSchema.safeParse({ ids });

    if (!parsed.success) {
      throw new ApiError(400, "Select at least one file.");
    }

    const response = await fetchWithSessionResponse("/files/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          response.headers.get("content-disposition") ??
          'attachment; filename="terasandi-files.zip"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
