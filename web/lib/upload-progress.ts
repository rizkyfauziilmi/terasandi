import type { UploadJob } from "@/components/upload/upload-provider";

const RUNNING_STATUSES = new Set<UploadJob["status"]>([
  "uploading",
  "processing",
]);

export interface UploadProgressSummary {
  /** Jobs the app can still work on: everything except permanently rejected files. */
  uploadable: UploadJob[];
  running: UploadJob[];
  queued: UploadJob[];
  failed: UploadJob[];
  done: UploadJob[];
  skippedCount: number;
  totalBytes: number;
  uploadedBytes: number;
  percent: number;
}

/**
 * Overall progress describes the work that can be done, not a success rate.
 * A file rejected before upload must not keep the bar from reaching 100%.
 */
export function summarizeUploadProgress(jobs: UploadJob[]): UploadProgressSummary {
  const uploadable = jobs.filter(
    (job) => !(job.status === "error" && !job.retryable),
  );
  const totalBytes = uploadable.reduce((total, job) => total + job.size, 0);
  const uploadedBytes = uploadable.reduce((total, job) => {
    if (job.status === "done") {
      return total + job.size;
    }
    if (RUNNING_STATUSES.has(job.status)) {
      return total + Math.round((job.size * job.progress) / 100);
    }
    return total;
  }, 0);

  return {
    uploadable,
    running: uploadable.filter((job) => RUNNING_STATUSES.has(job.status)),
    queued: uploadable.filter((job) => job.status === "queued"),
    failed: uploadable.filter((job) => job.status === "error"),
    done: uploadable.filter((job) => job.status === "done"),
    skippedCount: jobs.length - uploadable.length,
    totalBytes,
    uploadedBytes,
    percent:
      totalBytes === 0
        ? 0
        : Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)),
  };
}
