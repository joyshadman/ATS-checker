"use client";

import { useEffect } from "react";

/**
 * While the page prints, the document title is `title`, which browsers use as the PDF's
 * suggested file name and title; it goes back when the dialog closes, saved or
 * cancelled. Listens to print events, so Ctrl+P gets it too (spec 0008, AC-6, AC-10).
 */
export function usePrintTitle(title: string) {
  useEffect(() => {
    let previous: string | null = null;
    const before = () => {
      previous = document.title;
      document.title = title;
    };
    const after = () => {
      if (previous !== null) document.title = previous;
      previous = null;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      after();
    };
  }, [title]);
}
