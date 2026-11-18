import dynamic from "next/dynamic";
import { createElement } from "react";
import type { FilePreviewKind } from "@/lib/file-previews";
import { PreviewLoading } from "./preview-status";
import type { PreviewRendererProps } from "./types";

const loading = () => createElement(PreviewLoading);

const MarkdownRenderer = dynamic(() => import("./renderers/markdown-renderer"), {
  ssr: false,
  loading,
});
const DocxRenderer = dynamic(() => import("./renderers/docx-renderer"), {
  ssr: false,
  loading,
});
const SpreadsheetRenderer = dynamic(
  () => import("./renderers/spreadsheet-renderer"),
  { ssr: false, loading },
);
const PresentationRenderer = dynamic(
  () => import("./renderers/presentation-renderer"),
  { ssr: false, loading },
);
const ArchiveRenderer = dynamic(() => import("./renderers/archive-renderer"), {
  ssr: false,
  loading,
});

/** Each heavy renderer is a separate chunk, fetched only when opened. */
export function HeavyRenderer({
  kind,
  ...props
}: PreviewRendererProps & { kind: FilePreviewKind }) {
  switch (kind) {
    case "markdown":
      return createElement(MarkdownRenderer, props);
    case "docx":
      return createElement(DocxRenderer, props);
    case "spreadsheet":
      return createElement(SpreadsheetRenderer, props);
    case "presentation":
      return createElement(PresentationRenderer, props);
    case "archive":
      return createElement(ArchiveRenderer, props);
    default:
      return null;
  }
}
