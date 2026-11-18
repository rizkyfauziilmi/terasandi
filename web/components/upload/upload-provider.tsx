"use client";

import type { FileUploadTicket, StoredFile } from "@terasandi/contracts";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { FilePreviewKind } from "@/lib/file-previews";
import {
  isAbortError,
  messageOf,
  postRoute,
  putFile,
} from "@/lib/upload-client";

export type UploadStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export interface UploadJob {
  id: string;
  file: File;
  name: string;
  size: number;
  previewKind: FilePreviewKind;
  status: UploadStatus;
  progress: number;
  error?: string;
  retryable: boolean;
}

/** What the staging dialog hands to the global queue. */
export interface StagedUpload {
  id: string;
  file: File;
  name: string;
  size: number;
  previewKind: FilePreviewKind;
  /** Set when the dialog already rejected the file (empty, oversized, etc.). */
  error?: string;
}

interface UploadActions {
  enqueue: (uploads: StagedUpload[]) => void;
  retry: (id: string) => void;
  resume: () => void;
  cancel: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

type Action =
  | { type: "enqueue"; jobs: UploadJob[] }
  | { type: "patch"; id: string; patch: Partial<UploadJob> }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "clearDone" };

function reducer(state: UploadJob[], action: Action): UploadJob[] {
  switch (action.type) {
    case "enqueue":
      return [...state, ...action.jobs];
    case "patch":
      return state.map((job) =>
        job.id === action.id ? { ...job, ...action.patch } : job,
      );
    case "remove":
      return state.filter((job) => job.id !== action.id);
    case "clear":
      return [];
    case "clearDone":
      return state.filter((job) => job.status !== "done");
  }
}

const UploadStateContext = createContext<UploadJob[] | null>(null);
const UploadActionsContext = createContext<UploadActions | null>(null);

/** Holds the upload queue above the router so navigation cannot stop it. */
export function UploadProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [jobs, dispatch] = useReducer(reducer, []);
  const jobsRef = useRef<UploadJob[]>([]);
  const progressRef = useRef<Map<string, number>>(new Map());
  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Keep a synchronous mirror so the runner never reads a stale queue.
  const apply = useCallback((action: Action) => {
    const next = reducer(jobsRef.current, action);
    jobsRef.current = next;
    dispatch(action);
  }, []);

  const runQueue = useCallback(
    async (onlyIds?: string[]) => {
      if (runningRef.current) {
        return;
      }

      const queue = jobsRef.current.filter(
        (job) =>
          job.status === "queued" &&
          (!onlyIds || onlyIds.includes(job.id)),
      );

      if (queue.length === 0) {
        return;
      }

      runningRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for (const job of queue) {
          if (controller.signal.aborted) {
            break;
          }

          const current = jobsRef.current.find((candidate) => candidate.id === job.id);
          if (!current || current.status !== "queued") {
            continue;
          }

          progressRef.current.set(job.id, 0);
          apply({
            type: "patch",
            id: job.id,
            patch: { status: "processing", progress: 0, error: undefined },
          });

          try {
            const ticket = await postRoute<FileUploadTicket>(
              "/api/files/uploads",
              { name: job.name, size: job.size },
              controller.signal,
            );

            if (controller.signal.aborted) {
              throw new DOMException("Aborted", "AbortError");
            }

            apply({ type: "patch", id: job.id, patch: { status: "uploading" } });

            await putFile(
              ticket,
              job.file,
              (percent) => {
                const previous = progressRef.current.get(job.id) ?? -1;
                if (percent === previous) {
                  return;
                }
                progressRef.current.set(job.id, percent);
                apply({ type: "patch", id: job.id, patch: { progress: percent } });
              },
              controller.signal,
            );

            apply({
              type: "patch",
              id: job.id,
              patch: { status: "processing", progress: 100 },
            });

            const stored = await postRoute<StoredFile>(
              "/api/files/complete",
              { uploadId: ticket.uploadId, name: job.name },
              controller.signal,
            );

            apply({
              type: "patch",
              id: job.id,
              patch: {
                status: "done",
                name: stored.name,
                progress: 100,
                error: undefined,
              },
            });
            progressRef.current.delete(job.id);
            router.refresh();
          } catch (error) {
            progressRef.current.delete(job.id);

            if (isAbortError(error) || controller.signal.aborted) {
              apply({
                type: "patch",
                id: job.id,
                patch: { status: "queued", progress: 0, error: undefined },
              });
              break;
            }

            apply({
              type: "patch",
              id: job.id,
              patch: {
                status: "error",
                progress: 0,
                error: messageOf(error),
              },
            });
          }
        }
      } finally {
        runningRef.current = false;
        abortRef.current = null;
      }
    },
    [apply, router],
  );

  const enqueue = useCallback(
    (uploads: StagedUpload[]) => {
      if (uploads.length === 0) {
        return;
      }

      apply({
        type: "enqueue",
        jobs: uploads.map((upload) => ({
          ...upload,
          status: upload.error ? "error" : "queued",
          progress: 0,
          error: upload.error,
          retryable: !upload.error,
        })),
      });
      void runQueue();
    },
    [apply, runQueue],
  );

  const retry = useCallback(
    (id: string) => {
      const job = jobsRef.current.find((candidate) => candidate.id === id);

      if (runningRef.current || !job?.retryable) {
        return;
      }

      apply({
        type: "patch",
        id,
        patch: { status: "queued", progress: 0, error: undefined },
      });
      void runQueue([id]);
    },
    [apply, runQueue],
  );

  const resume = useCallback(() => {
    void runQueue();
  }, [runQueue]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const remove = useCallback(
    (id: string) => {
      progressRef.current.delete(id);
      apply({ type: "remove", id });
    },
    [apply],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    progressRef.current.clear();
    apply({ type: "clear" });
  }, [apply]);

  // A finished batch keeps its success state briefly, then disappears.
  useEffect(() => {
    if (jobs.length === 0 || !jobs.every((job) => job.status === "done")) {
      return;
    }

    const timer = setTimeout(() => apply({ type: "clearDone" }), 4000);
    return () => clearTimeout(timer);
  }, [jobs, apply]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const active = jobsRef.current.some(
        (job) =>
          job.status === "queued" ||
          job.status === "uploading" ||
          job.status === "processing",
      );

      if (active) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const actions = useMemo<UploadActions>(
    () => ({ enqueue, retry, resume, cancel, remove, clear }),
    [enqueue, retry, resume, cancel, remove, clear],
  );

  return (
    <UploadActionsContext.Provider value={actions}>
      <UploadStateContext.Provider value={jobs}>
        {children}
      </UploadStateContext.Provider>
    </UploadActionsContext.Provider>
  );
}

export function useUploadJobs(): UploadJob[] {
  const jobs = useContext(UploadStateContext);

  if (!jobs) {
    throw new Error("useUploadJobs must be used inside UploadProvider.");
  }

  return jobs;
}

export function useUploadActions(): UploadActions {
  const actions = useContext(UploadActionsContext);

  if (!actions) {
    throw new Error("useUploadActions must be used inside UploadProvider.");
  }

  return actions;
}
