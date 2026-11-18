"use client";

import { useEffect, useRef, useState } from "react";
import { PreviewLoading } from "../preview-status";
import { readPreviewBytes, type PreviewRendererProps } from "../types";

/** Approximate Word rendering in the browser; scripts are stripped afterwards. */
export default function DocxRenderer({
  active,
  file,
  name,
  url,
  onError,
}: PreviewRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const [docx, dompurifyModule] = await Promise.all([
          import("docx-preview"),
          import("dompurify"),
        ]);
        const bytes = await readPreviewBytes(
          { name, file, url, active },
          controller.signal,
        );
        const container = containerRef.current;

        if (!container || controller.signal.aborted) {
          return;
        }

        await docx.renderAsync(bytes, container, container, {
          inWrapper: false,
          ignoreWidth: true,
          ignoreHeight: true,
          renderHeaders: false,
          renderFooters: false,
        });

        if (controller.signal.aborted) {
          return;
        }

        container.innerHTML = dompurifyModule.default.sanitize(
          container.innerHTML,
          { USE_PROFILES: { html: true }, ADD_TAGS: ["style"] },
        );
        setReady(true);
      } catch {
        if (!controller.signal.aborted) {
          onError();
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [active, file, name, onError, url]);

  return (
    <div className="relative min-h-[20vh]">
      <div
        ref={containerRef}
        className="max-h-[50vh] min-h-[20vh] overflow-auto rounded-md bg-background p-4 text-sm"
      />
      {!ready && (
        <div className="absolute inset-0 flex items-start justify-center rounded-md bg-background/80">
          <PreviewLoading label="Rendering document…" />
        </div>
      )}
    </div>
  );
}
