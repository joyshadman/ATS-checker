"use client";

import type { SectionTarget } from "@/lib/resume/section-writing";
import { aiButtonId, useAiWriting } from "./ai-writing";

export function SparkleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

/**
 * Starts an AI request for one target (spec 0003). Unavailable via aria-disabled (so
 * focus stays put) while a request runs, during the cooldown window, or when the
 * target has nothing to write from (`reason`, shown as visible helper text).
 */
export function AiButton({
  aiKey,
  label,
  reason,
  buildTarget,
}: {
  aiKey: string;
  label: string;
  /** Why it cannot run (AC-6); null when it can. An empty string hides the hint. */
  reason: string | null;
  buildTarget: () => SectionTarget;
}) {
  const { busy, cooldownLeft, request } = useAiWriting();
  const unavailable = busy || cooldownLeft > 0 || reason !== null;
  const id = aiButtonId(aiKey);
  const hintId = reason ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        id={id}
        type="button"
        aria-disabled={unavailable}
        aria-describedby={hintId}
        onClick={() => {
          if (!unavailable) request(buildTarget());
        }}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 whitespace-nowrap ${
          unavailable
            ? "border-border/60 text-muted/70 cursor-not-allowed"
            : "border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 hover:border-accent/50"
        }`}
      >
        <SparkleIcon />
        {label}
      </button>
      {reason && (
        <p id={hintId} className="text-[11px] text-muted text-right max-w-[16rem]">
          {reason}
        </p>
      )}
    </div>
  );
}
