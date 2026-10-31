"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ResumeContent } from "@/lib/resume/content";
import { sheetFontVariables } from "@/lib/resume/fonts";
import { paginate } from "@/lib/resume/paginate";
import type { SheetBlock, SheetOptions, TemplateModule } from "@/components/resume/viewer/parts";

// A4 at 96 px per inch (AC-10). Layout is always computed at this width; the screen
// width only changes the display scale.
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
// A4 is 1122.5 px tall; a printed page box a fraction too tall makes browsers add a
// blank page. Content never reaches the last pixel (bottom margin is at least 48 px).
const PRINT_PAGE_HEIGHT = 1122;

type Props = SheetOptions & {
  content: ResumeContent;
  template: TemplateModule;
  onPageCount?: (count: number) => void;
  /** Also render a print only copy of the measured pages (spec 0008). */
  printable?: boolean;
};

type Layout = { blocks: SheetBlock[]; pages: number[][] };

/**
 * The resume as A4 pages. Blocks are rendered once in a hidden box at the page's
 * content width, measured after fonts load, and split into pages by `paginate`.
 */
export function PaginatedSheet({ content, template, linkStyle, highlight, onPageCount, printable = false }: Props) {
  const blocks = useMemo(
    () => template.blocks(content, { linkStyle, highlight }),
    [template, content, linkStyle, highlight]
  );
  const contentWidth = PAGE_WIDTH - 2 * template.margin;
  const pageHeight = PAGE_HEIGHT - 2 * template.margin;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [scale, setScale] = useState(1);

  const measure = useCallback(() => {
    const box = measureRef.current;
    if (!box) return;
    const children = Array.from(box.children) as HTMLElement[];
    const tops = children.map((child) => child.getBoundingClientRect().top);
    const bottom = box.getBoundingClientRect().bottom;
    // Top to next top, so the spacing between blocks is counted.
    const heights = tops.map((top, i) => (i + 1 < tops.length ? tops[i + 1] : bottom) - top);
    const pages = paginate(heights, blocks.map((b) => b.keepWithNext), pageHeight);
    setLayout((prev) =>
      prev && prev.blocks === blocks && samePages(prev.pages, pages) ? prev : { blocks, pages }
    );
  }, [blocks, pageHeight]);

  // Measure before paint on every change, then again once fonts finish loading (AC-19).
  useLayoutEffect(() => {
    measure();
    let active = true;
    document.fonts?.ready.then(() => active && measure());
    const box = measureRef.current;
    const observer = box ? new ResizeObserver(() => measure()) : null;
    if (box) observer?.observe(box);
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      active = false;
      observer?.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [measure]);

  // Scale whole pages down to fit narrow screens, never reflow (AC-10).
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => setScale(Math.min(1, wrapper.clientWidth / PAGE_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const pages = layout && layout.blocks === blocks ? layout.pages : null;

  // Turning the highlight off only removes <mark> padding, so blocks can only shrink and
  // the measured page assignment still fits (spec 0008).
  const printBlocks = useMemo(
    () => (printable ? template.blocks(content, { linkStyle, highlight: false }) : null),
    [printable, template, content, linkStyle]
  );

  useEffect(() => {
    if (pages) onPageCount?.(pages.length);
  }, [pages, onPageCount]);

  const pageClass = `bg-sheet-paper text-sheet-ink shadow-card antialiased [&>*:first-child>*]:pt-0 ${template.pageClassName}`;
  const pageStyle = { width: PAGE_WIDTH, padding: template.margin, transform: `scale(${scale})`, transformOrigin: "top left" };

  return (
    <div ref={wrapperRef} className="w-full overflow-x-clip">
      <div aria-hidden="true" className="relative h-0 overflow-hidden">
        <div
          ref={measureRef}
          className={`invisible absolute left-0 top-0 ${template.pageClassName}`}
          style={{ width: contentWidth }}
        >
          {blocks.map((block) => (
            <div key={block.key}>{block.node}</div>
          ))}
        </div>
      </div>

      {pages ? (
        <div className="flex flex-col items-center gap-6">
          {pages.map((indexes, p) => (
            <div key={p} className="flex flex-col items-center gap-2">
              <div style={{ width: PAGE_WIDTH * scale, height: PAGE_HEIGHT * scale }}>
                <article className={pageClass} style={{ ...pageStyle, height: PAGE_HEIGHT }}>
                  {indexes.map((i) => (
                    <div key={blocks[i].key}>{blocks[i].node}</div>
                  ))}
                </article>
              </div>
              <p className="text-xs text-muted tabular-nums">
                Page {p + 1} of {pages.length}
              </p>
            </div>
          ))}
          {printBlocks &&
            createPortal(
              // Print copy (spec 0008): the same measured pages at full size, no highlight.
              // The print stylesheet hides every other child of <body>.
              <div data-print-root className={`hidden print:block ${sheetFontVariables}`}>
                <style>{"@page { size: A4; margin: 0; }"}</style>
                {pages.map((indexes, p) => (
                  <article
                    key={p}
                    data-print-page
                    className={`bg-sheet-paper text-sheet-ink antialiased [&>*:first-child>*]:pt-0 ${template.pageClassName}`}
                    style={{ width: PAGE_WIDTH, height: PRINT_PAGE_HEIGHT, padding: template.margin }}
                  >
                    {indexes.map((i) => (
                      <div key={printBlocks[i].key}>{printBlocks[i].node}</div>
                    ))}
                  </article>
                ))}
              </div>,
              document.body
            )}
        </div>
      ) : (
        // Before the first measurement: everything on one page, so text shows at once.
        <div className="flex justify-center">
          <article className={pageClass} style={{ ...pageStyle, minHeight: PAGE_HEIGHT, transform: undefined, maxWidth: "100%" }}>
            {blocks.map((block) => (
              <div key={block.key}>{block.node}</div>
            ))}
          </article>
        </div>
      )}
    </div>
  );
}

function samePages(a: number[][], b: number[][]): boolean {
  return a.length === b.length && a.every((page, i) => page.length === b[i].length && page.every((x, j) => x === b[i][j]));
}
