import type { FilesResponse } from "@terasandi/contracts";
import { AlertCircleIcon, FolderOpenIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { apiErrorMessage } from "@/lib/api/client";
import { fetchWithSession } from "@/lib/api-authenticated";
import { formatBytes } from "@/lib/files";
import { FileList } from "./file-list";
import { SummaryCards } from "./summary-cards";
import { UploadDialog } from "./upload-dialog";

/** Fetches the signed-in user's files and renders the whole dashboard body. */
export async function FilesSection() {
  let result: FilesResponse;

  try {
    result = await fetchWithSession<FilesResponse>("/files");
  } catch (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Could not load files</AlertTitle>
        <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }

  const count = result.files.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? "file" : "files"} · {formatBytes(result.totalSize)} used
        </p>
        <UploadDialog maxFileSize={result.maxFileSize} />
      </div>

      <SummaryCards totals={result.totals} />

      {count === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpenIcon />
            </EmptyMedia>
            <EmptyTitle>No files yet</EmptyTitle>
            <EmptyDescription>
              Upload your first file to see it here. Your files stay private to you.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <FileList files={result.files} />
      )}
    </div>
  );
}
