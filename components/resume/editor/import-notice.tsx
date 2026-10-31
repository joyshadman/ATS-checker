"use client";

import { useState } from "react";
import Link from "next/link";
import { dismissImportNotice } from "@/actions/resume-import";
import { IMPORT_TRUNCATED_LINE, type ImportNotice as ImportNoticeData } from "@/lib/resume/import";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "@/components/ui/icons";

// The notice an imported copy shows above its sections (spec 0006, AC-8). It stays
// until Dismiss, which clears it on the server without touching the content version.

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={copied ? "Copied" : `Copy: ${text.slice(0, 60)}`}
      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ImportNotice({
  resumeId,
  notice,
  importedFrom,
}: {
  resumeId: string;
  notice: ImportNoticeData;
  importedFrom: { id: string; title: string } | null;
}) {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  async function dismiss() {
    setDismissing(true);
    setError(null);
    try {
      const result = await dismissImportNotice(resumeId);
      if (result.success) {
        setVisible(false);
        return;
      }
      setError(result.error);
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setDismissing(false);
  }

  return (
    <section
      aria-labelledby="import-notice-title"
      className="rounded-xl border border-accent/25 bg-accent/5 p-4 text-sm space-y-3"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-accent" aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <p id="import-notice-title" className="text-foreground">
            {importedFrom ? (
              <>
                Imported from{" "}
                <Link
                  href={`/resumes/${importedFrom.id}`}
                  className="font-semibold text-accent underline underline-offset-2"
                >
                  {importedFrom.title}
                </Link>
                .
              </>
            ) : (
              "Imported from an upload."
            )}{" "}
            Check each section against your original.
          </p>
          {notice.truncated && <p className="text-warning">{IMPORT_TRUNCATED_LINE}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" loading={dismissing} onClick={() => void dismiss()}>
          Dismiss
        </Button>
      </div>

      {notice.leftover.length > 0 && (
        <div className="space-y-2 pl-7">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Not imported</h2>
          <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {notice.leftover.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-foreground"
              >
                <span className="flex-1 whitespace-pre-wrap break-words">{item}</span>
                <CopyButton text={item} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="pl-7 text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
