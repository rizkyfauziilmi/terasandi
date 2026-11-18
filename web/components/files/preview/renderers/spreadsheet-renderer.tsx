"use client";

import { useEffect, useState } from "react";
import { PreviewEmpty, PreviewLoading } from "../preview-status";
import { readPreviewBytes, type PreviewRendererProps } from "../types";

const MAX_ROWS = 200;
const MAX_COLUMNS = 50;
const CSV_LIMIT = 1024 * 1024;

interface PreviewTable {
  rows: string[][];
  truncated: boolean;
}

/** Lightweight sheet/csv preview: bounded rows, no external spreadsheet engine. */
export default function SpreadsheetRenderer({
  active,
  file,
  name,
  mimeType,
  url,
  onError,
}: PreviewRendererProps) {
  const [table, setTable] = useState<PreviewTable | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const lower = name.toLowerCase();
        const isDelimited =
          lower.endsWith(".csv") ||
          lower.endsWith(".tsv") ||
          mimeType === "text/csv" ||
          mimeType === "tab-separated-values";
        const bytes = await readPreviewBytes(
          { name, file, url, active },
          controller.signal,
          isDelimited ? CSV_LIMIT : undefined,
        );

        const parsed = isDelimited
          ? parseDelimited(new TextDecoder().decode(bytes), lower.endsWith(".tsv") ? "\t" : ",")
          : await parseXlsx(bytes);

        if (!controller.signal.aborted) {
          setTable(parsed);
        }
      } catch {
        if (!controller.signal.aborted) {
          onError();
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [active, file, mimeType, name, onError, url]);

  if (table === null) {
    return <PreviewLoading label="Reading spreadsheet…" />;
  }

  if (table.rows.length === 0) {
    return <PreviewEmpty label="This sheet has no readable cells." />;
  }

  const width = Math.max(...table.rows.map((row) => row.length));

  return (
    <div className="space-y-2">
      <div className="max-h-[50vh] overflow-auto rounded-md border">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {Array.from({ length: width }, (_, index) => (
                <th key={index} className="border-b border-r px-2 py-1 font-medium">
                  {columnLabel(index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="even:bg-muted/40">
                {Array.from({ length: width }, (_, index) => (
                  <td key={index} className="border-b border-r px-2 py-1 align-top">
                    {row[index] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.truncated && (
        <p className="text-xs text-muted-foreground">
          Showing the first {MAX_ROWS} rows and {MAX_COLUMNS} columns.
        </p>
      )}
    </div>
  );
}

async function parseXlsx(bytes: Uint8Array): Promise<PreviewTable> {
  const { unzipSync } = await import("fflate");
  const entries = unzipSync(bytes, {
    filter: (file) =>
      file.name === "xl/sharedStrings.xml" ||
      /^xl\/worksheets\/sheet\d+\.xml$/.test(file.name),
  });
  const shared = parseSharedStrings(entries["xl/sharedStrings.xml"]);
  const sheetPath = Object.keys(entries)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
    .sort()[0];

  if (!sheetPath) {
    throw new Error("No worksheet found");
  }

  const sheet = parseXml(entries[sheetPath]);
  const rows: string[][] = [];
  let truncated = false;

  for (const row of nodes(sheet, "row")) {
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      break;
    }

    const cells: string[] = [];

    for (const cell of nodes(row, "c")) {
      const index = columnIndex(cell.getAttribute("r") ?? "");
      if (index >= MAX_COLUMNS) {
        truncated = true;
        continue;
      }

      while (cells.length < index) {
        cells.push("");
      }

      const type = cell.getAttribute("t");
      const raw = nodeText(nodes(cell, "v")[0]);
      let value = raw;

      if (type === "s") {
        value = shared[Number(raw)] ?? "";
      } else if (type === "inlineStr") {
        value = nodes(cell, "t")
          .map(nodeText)
          .join("");
      } else if (type === "b") {
        value = raw === "1" ? "TRUE" : "FALSE";
      }

      cells[index] = value.replace(/\0/g, "").trimEnd();
    }

    rows.push(cells);
  }

  return { rows, truncated };
}

function parseSharedStrings(bytes: Uint8Array | undefined): string[] {
  if (!bytes) {
    return [];
  }

  return nodes(parseXml(bytes), "si").map((item) =>
    nodes(item, "t")
      .map(nodeText)
      .join(""),
  );
}

function parseDelimited(text: string, delimiter: string): PreviewTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let truncated = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row.slice(0, MAX_COLUMNS));
      if (row.length > MAX_COLUMNS) {
        truncated = true;
      }
      row = [];
      field = "";
      if (rows.length >= MAX_ROWS) {
        truncated = true;
        break;
      }
    } else {
      field += char;
    }
  }

  if (!truncated && (field.length > 0 || row.length > 0)) {
    row.push(field);
    rows.push(row.slice(0, MAX_COLUMNS));
    if (row.length > MAX_COLUMNS) {
      truncated = true;
    }
  }

  return { rows, truncated };
}

function parseXml(bytes: Uint8Array): Document {
  const xml = new TextDecoder().decode(bytes);
  const document = new DOMParser().parseFromString(xml, "application/xml");

  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid XML");
  }

  return document;
}

function nodes(root: Document | Element, name: string): Element[] {
  return Array.from(root.getElementsByTagNameNS("*", name));
}

function nodeText(node: Element | undefined): string {
  return node?.textContent ?? "";
}

function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Za-z]+/)?.[0] ?? "";
  let value = 0;

  for (const letter of letters.toUpperCase()) {
    value = value * 26 + (letter.charCodeAt(0) - 64);
  }

  return Math.max(0, value - 1);
}

function columnLabel(index: number): string {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}
