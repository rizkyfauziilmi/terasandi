"use client";

import { useEffect, useState } from "react";
import { PreviewEmpty, PreviewLoading } from "../preview-status";
import { readPreviewBytes, type PreviewRendererProps } from "../types";

const MAX_SLIDES = 50;

interface PreviewSlide {
  number: number;
  paragraphs: string[];
}

/** Text-only slide outline; layouts and media are intentionally skipped. */
export default function PresentationRenderer({
  active,
  file,
  name,
  url,
  onError,
}: PreviewRendererProps) {
  const [slides, setSlides] = useState<PreviewSlide[] | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      try {
        const [{ unzipSync }, bytes] = await Promise.all([
          import("fflate"),
          readPreviewBytes({ name, file, url, active }, controller.signal),
        ]);
        const entries = unzipSync(bytes, {
          filter: (file) => /^ppt\/slides\/slide\d+\.xml$/.test(file.name),
        });
        const parsed = Object.keys(entries)
          .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
          .sort(compareSlidePaths)
          .slice(0, MAX_SLIDES)
          .map((path, index) => parseSlide(entries[path], index + 1));

        if (!controller.signal.aborted) {
          setSlides(parsed);
        }
      } catch {
        if (!controller.signal.aborted) {
          onError();
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [active, file, name, onError, url]);

  if (slides === null) {
    return <PreviewLoading label="Reading presentation…" />;
  }

  if (slides.length === 0) {
    return <PreviewEmpty label="This presentation has no readable slides." />;
  }

  return (
    <div className="max-h-[50vh] space-y-3 overflow-auto">
      {slides.map((slide) => (
        <section key={slide.number} className="rounded-md border p-4">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            Slide {slide.number}
          </h3>
          {slide.paragraphs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No text on this slide.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {slide.paragraphs.map((paragraph, index) => (
                <li key={index}>{paragraph || "\u00a0"}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function compareSlidePaths(a: string, b: string): number {
  const number = (path: string) => Number(path.match(/slide(\d+)\.xml/)?.[1] ?? 0);

  return number(a) - number(b);
}

function parseSlide(bytes: Uint8Array, number: number): PreviewSlide {
  const xml = new TextDecoder().decode(bytes);
  const document = new DOMParser().parseFromString(xml, "application/xml");

  if (document.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid XML");
  }

  const paragraphs = Array.from(document.getElementsByTagNameNS("*", "p"))
    .map((paragraph) =>
      Array.from(paragraph.getElementsByTagNameNS("*", "t"))
        .map((node) => node.textContent ?? "")
        .join("")
        .trim(),
    )
    .filter((text) => text.length > 0)
    .slice(0, 100);

  return { number, paragraphs };
}
