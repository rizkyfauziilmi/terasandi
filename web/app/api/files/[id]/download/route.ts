import type { DownloadUrl } from "@terasandi/contracts";
import { redirect } from "next/navigation";
import { routeErrorResponse } from "@/lib/api/route";
import { fetchWithSession } from "@/lib/api-authenticated";

/** Redirects to a short-lived signed URL for one of the user's own files. */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/files/[id]/download">,
): Promise<Response> {
  const { id } = await context.params;
  let link: DownloadUrl;

  try {
    link = await fetchWithSession<DownloadUrl>(`/files/${id}/download`);
  } catch (error) {
    return routeErrorResponse(error);
  }

  // `redirect` throws; keep it outside the try block.
  redirect(link.url);
}
