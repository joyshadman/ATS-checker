"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Props = {
  resumeId: string;
  /** The saved sheet's pages have been measured after fonts loaded (AC-5). */
  ready: boolean;
  /** A template or link style save is in flight (AC-4). */
  saving: boolean;
  hasBody: boolean;
  placeholderCount: number;
};

/**
 * Download PDF (spec 0008): opens the browser print dialog on the viewer's print copy,
 * after a confirm when placeholders are left (AC-7). Nothing goes to the server (AC-12).
 */
export function PdfDownloadButton({ resumeId, ready, saving, hasBody, placeholderCount }: Props) {
  const [confirming, setConfirming] = useState(false);

  const label = !hasBody ? "Download PDF" : !ready ? "Preparing pages…" : saving ? "Saving…" : "Download PDF";
  const disabled = !hasBody || !ready || saving;

  function download() {
    if (placeholderCount > 0) setConfirming(true);
    else window.print();
  }

  function downloadAnyway() {
    setConfirming(false);
    // Let the dialog close before the print dialog takes over the page.
    setTimeout(() => window.print(), 0);
  }

  const title =
    placeholderCount === 1
      ? "1 placeholder is still in your resume"
      : `${placeholderCount} placeholders are still in your resume`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <Button type="button" onClick={download} disabled={disabled} className="self-start shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
        </svg>
        {label}
      </Button>
      <p className="text-xs text-muted leading-relaxed">
        Choose Save as PDF in the print dialog. Turn off Headers and footers if you see them.
      </p>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={title}
        description="Placeholders print exactly as written, brackets included. Replace them in the editor, or download anyway."
      >
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Link
            href={`/resumes/${resumeId}/edit`}
            className="inline-flex items-center justify-center rounded-xl border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-card-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Edit resume
          </Link>
          <Button type="button" onClick={downloadAnyway}>
            Download anyway
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
