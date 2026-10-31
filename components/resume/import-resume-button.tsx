"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { importResume } from "@/actions/resume-import";
import {
  AI_LIMIT_REACHED,
  balanceLabel,
  balanceTotal,
  PRICING_PATH,
  type AiBalanceView,
} from "@/lib/ai/credits-shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Loader2 } from "@/components/ui/icons";

// Import an upload into the editor (spec 0006): the button, the cost dialog, and the
// running, failed, and timed out states. One request per dialog at a time.

const WATCHDOG_MS = 100_000;
const OFFLINE = "Could not reach the server. Try again.";
const NO_TEXT = "This upload has no text to import";

type Step =
  | { kind: "confirm" }
  | { kind: "running" }
  | { kind: "error"; message: string }
  | { kind: "timedOut" };

type Props = {
  resumeId: string;
  hasText: boolean;
  /** AI uses left (spec 0004); null when it could not be loaded. */
  balance: AiBalanceView | null;
  /** The newest imported copy of this upload, if any (AC-9). */
  latestImport: { id: string; title: string } | null;
};

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

const TRIGGER =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ImportResumeButton({ resumeId, hasText, balance, latestImport }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "confirm" });
  const requestIdRef = useRef<string | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(
    () => () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    },
    []
  );

  const outOfUses = balance !== null && balanceTotal(balance) === 0;
  const running = step.kind === "running";

  function openDialog() {
    if (!hasText) return;
    setStep({ kind: "confirm" });
    setOpen(true);
  }

  function close() {
    if (running) return; // AC-11: cannot be closed while the import runs
    const wasTimedOut = step.kind === "timedOut";
    requestIdRef.current = null;
    setOpen(false);
    // A copy may have finished meanwhile; refreshing lets AC-9 offer it.
    if (wasTimedOut) router.refresh();
  }

  async function start() {
    if (running || outOfUses) return;
    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    setStep({ kind: "running" });

    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (requestIdRef.current === requestId) setStep({ kind: "timedOut" });
    }, WATCHDOG_MS);

    let result: Awaited<ReturnType<typeof importResume>> | null = null;
    try {
      result = await importResume({ resumeId, nonce: crypto.randomUUID() });
    } catch {
      result = null;
    }

    // Abandoned (dialog closed after a timeout) or replaced by a newer request.
    if (requestIdRef.current !== requestId || !openRef.current) return;
    if (watchdogRef.current) clearTimeout(watchdogRef.current);

    if (result?.success) {
      router.push(`/resumes/${result.data.id}/edit`);
      return;
    }
    setStep({ kind: "error", message: result ? result.error : OFFLINE });
  }

  const costLine =
    balance === null || outOfUses ? "Uses 1 AI use." : `Uses 1 AI use. You have ${balanceLabel(balance)}.`;

  const pricingHint = (
    <p className="text-sm text-muted">
      No AI uses left.{" "}
      <Link href={PRICING_PATH} prefetch={false} className="font-semibold text-accent underline underline-offset-2">
        See pricing
      </Link>
    </p>
  );

  const importButton = (label: string, variant: "primary" | "secondary") => (
    <Button
      type="button"
      variant={variant}
      aria-disabled={outOfUses}
      className={outOfUses ? "opacity-40 cursor-not-allowed" : ""}
      onClick={() => void start()}
    >
      {label}
    </Button>
  );

  let body: ReactNode;
  let title = "Open in editor";
  if (step.kind === "running") {
    body = (
      <div role="status" className="flex items-center gap-3 py-2 text-sm text-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden="true" />
        Reading your resume. This can take up to a minute.
      </div>
    );
  } else if (step.kind === "timedOut") {
    body = (
      <>
        <p role="alert" className="text-sm text-foreground">
          This is taking too long. If it finishes, the copy will appear in your Resumes list.
        </p>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={close}>
            Close
          </Button>
        </div>
      </>
    );
  } else if (step.kind === "error") {
    const limited = step.message === AI_LIMIT_REACHED;
    body = (
      <>
        <p role="alert" className="text-sm text-danger">
          {step.message}
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Close
          </Button>
          {limited ? (
            <Link
              href={PRICING_PATH}
              prefetch={false}
              className={`${TRIGGER} bg-gradient-primary text-cream shadow-sm hover:brightness-110`}
            >
              See pricing
            </Link>
          ) : (
            <Button type="button" onClick={() => void start()}>
              Try again
            </Button>
          )}
        </div>
      </>
    );
  } else if (latestImport) {
    title = "You already imported this resume.";
    body = (
      <>
        <p className="text-sm text-muted">
          Open your copy for free, or import the upload again to make another copy. {costLine}
        </p>
        {outOfUses && pricingHint}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {importButton("Import again", "secondary")}
          <Link
            href={`/resumes/${latestImport.id}/edit`}
            className={`${TRIGGER} bg-gradient-primary text-cream shadow-sm hover:brightness-110`}
          >
            Open the imported copy
          </Link>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-muted">
          The AI splits your upload into sections you can edit, word for word. Your upload stays exactly as it is.
        </p>
        <p className="text-sm font-medium text-foreground">{costLine}</p>
        {outOfUses && pricingHint}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          {importButton("Import", "primary")}
        </div>
      </>
    );
  }

  const hintId = `import-${resumeId}-hint`;

  return (
    <div className="flex flex-col items-start sm:items-end gap-1">
      <button
        type="button"
        aria-disabled={!hasText}
        aria-describedby={hasText ? undefined : hintId}
        onClick={openDialog}
        className={`${TRIGGER} ${
          hasText
            ? "bg-gradient-primary text-cream shadow-sm hover:brightness-110 hover:shadow-md"
            : "border border-border/60 text-muted/70 cursor-not-allowed"
        }`}
      >
        <EditIcon />
        Open in editor
      </button>
      {!hasText && (
        <p id={hintId} className="text-xs text-muted">
          {NO_TEXT}
        </p>
      )}

      <Dialog open={open} onClose={close} title={title} closable={!running}>
        <div className="space-y-4">{body}</div>
      </Dialog>
    </div>
  );
}
