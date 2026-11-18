"use client";

import { useEffect, useState } from "react";
import { PreviewEmpty, PreviewLoading } from "../preview-status";
import { readPreviewText, type PreviewRendererProps } from "../types";

/** Markdown is parsed in the browser, then sanitized before insertion. */
export default function MarkdownRenderer({
  active,
  file,
  text,
  url,
  onError,
  name,
}: PreviewRendererProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const [markedModule, dompurifyModule] = await Promise.all([
          import("marked"),
          import("dompurify"),
        ]);
        const source = await readPreviewText(
          { name, file, text, url, active },
          controller.signal,
        );
        const parsed = await markedModule.marked.parse(source);
        const clean = dompurifyModule.default.sanitize(parsed, {
          USE_PROFILES: { html: true },
        });

        if (!controller.signal.aborted) {
          setHtml(clean);
        }
      } catch {
        if (!controller.signal.aborted) {
          onError();
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [active, file, name, onError, text, url]);

  if (html === null) {
    return <PreviewLoading />;
  }

  if (!html.trim()) {
    return <PreviewEmpty label="No text preview available." />;
  }

  return (
    <div
      className="max-h-[50vh] space-y-2 overflow-auto rounded-md bg-muted p-4 text-sm [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_img]:max-w-full [&_li]:ml-5 [&_li]:list-disc [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-background [&_pre]:p-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
