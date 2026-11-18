import { routeErrorResponse } from "@/lib/api/route";
import { fetchWithSessionResponse } from "@/lib/api-authenticated";

/** Streams one of the user's files inline for the preview dialog. */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/files/[id]/preview">,
): Promise<Response> {
  const { id } = await context.params;

  try {
    const response = await fetchWithSessionResponse(`/files/${id}/preview`);

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
