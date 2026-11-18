"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { PREVIEW_ICONS } from "@/lib/file-previews";
import { formatBytes } from "@/lib/files";
import { useUploadActions, useUploadJobs, type UploadJob } from "./upload-provider";

const RUNNING_STATUSES = new Set(["uploading", "processing"]);

/** A persistent, bottom-right panel that survives route changes. */
export function UploadManager() {
  const jobs = useUploadJobs();
  const { retry, resume, cancel, remove, clear } = useUploadActions();

  const running = jobs.filter((job) => RUNNING_STATUSES.has(job.status));
  const queued = jobs.filter((job) => job.status === "queued");
  const failed = jobs.filter((job) => job.status === "error");
  const done = jobs.filter((job) => job.status === "done");

  const totalBytes = jobs.reduce((total, job) => total + job.size, 0);
  const uploadedBytes = jobs.reduce((total, job) => {
    if (job.status === "done") {
      return total + job.size;
    }
    if (RUNNING_STATUSES.has(job.status)) {
      return total + Math.round((job.size * job.progress) / 100);
    }
    return total;
  }, 0);
  const overall =
    totalBytes === 0
      ? 0
      : Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));

  if (jobs.length === 0) {
    return null;
  }

  const title =
    running.length > 0
      ? `Uploading ${running.length} ${running.length === 1 ? "file" : "files"}`
      : failed.length > 0
        ? `${failed.length} ${failed.length === 1 ? "upload needs" : "uploads need"} attention`
        : queued.length > 0
          ? `${queued.length} ${queued.length === 1 ? "upload is" : "uploads are"} paused`
          : "Uploads complete";

  return (
    <Card
      size="sm"
      aria-label="Upload progress"
      className="fixed right-4 bottom-20 z-40 w-[min(24rem,calc(100vw-2rem))] bg-popover text-popover-foreground shadow-lg ring-0 [--card-spacing:--spacing(3)]"
    >
      <Collapsible defaultOpen>
        <CardHeader className="py-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              {running.length > 0 ? (
                <Spinner className="size-4" />
              ) : failed.length > 0 ? (
                <TriangleAlertIcon className="size-4 text-destructive" />
              ) : queued.length > 0 ? (
                <UploadIcon className="size-4" />
              ) : (
                <CheckIcon className="size-4 text-emerald-600" />
              )}
            </span>
            <span className="min-w-0 truncate">{title}</span>
          </CardTitle>

          <CardDescription className="text-xs">
            {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)} · {done.length}/
            {jobs.length} done
          </CardDescription>

          <CardAction>
            <CollapsibleTrigger
              render={(props, state) => (
                <Button
                  {...props}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Toggle upload details"
                >
                  {state.open ? <ChevronDownIcon /> : <ChevronUpIcon />}
                </Button>
              )}
            />
          </CardAction>
        </CardHeader>

        <CardContent className="pb-3">
          <Progress value={overall} aria-live="polite">
            <ProgressValue />
          </Progress>
        </CardContent>

        <CollapsibleContent className="flex max-h-64 flex-col gap-1 overflow-y-auto border-t p-2">
          {jobs.map((job) => (
            <UploadJobRow key={job.id} job={job} onRetry={retry} onRemove={remove} />
          ))}
        </CollapsibleContent>

        <CardFooter className="justify-end p-2">
          {running.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={cancel}>
              Cancel
            </Button>
          ) : queued.length > 0 ? (
            <Button type="button" size="sm" onClick={resume}>
              <UploadIcon />
              Resume
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
        </CardFooter>
      </Collapsible>
    </Card>
  );
}

interface UploadJobRowProps {
  job: UploadJob;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

function UploadJobRow({ job, onRetry, onRemove }: UploadJobRowProps) {
  const Icon =
    job.status === "error" ? TriangleAlertIcon : PREVIEW_ICONS[job.previewKind];
  const busy = RUNNING_STATUSES.has(job.status);

  return (
    <Attachment
      state={job.status === "queued" ? "idle" : job.status}
      size="sm"
      className="w-full"
    >
      <AttachmentMedia>
        {busy ? <Spinner /> : <Icon />}
      </AttachmentMedia>

      <AttachmentContent>
        <AttachmentTitle>{job.name}</AttachmentTitle>
        <AttachmentDescription>
          {statusText(job)} · {formatBytes(job.size)}
          {job.error ? ` · ${job.error}` : ""}
        </AttachmentDescription>
        {job.status === "uploading" && (
          <Progress value={job.progress} className="mt-1">
            <ProgressValue />
          </Progress>
        )}
      </AttachmentContent>

      <AttachmentActions>
        {job.status === "error" && job.retryable && (
          <AttachmentAction
            title="Retry"
            aria-label={`Retry ${job.name}`}
            onClick={() => onRetry(job.id)}
          >
            <RotateCcwIcon />
          </AttachmentAction>
        )}
        <AttachmentAction
          title={busy ? "Uploading" : "Remove"}
          aria-label={busy ? `${job.name} is uploading` : `Remove ${job.name}`}
          disabled={busy}
          onClick={() => onRemove(job.id)}
        >
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}

function statusText(job: UploadJob): string {
  switch (job.status) {
    case "queued":
      return "Queued";
    case "uploading":
      return `Uploading ${job.progress}%`;
    case "processing":
      return "Processing";
    case "done":
      return "Uploaded";
    case "error":
      return "Failed";
  }
}
