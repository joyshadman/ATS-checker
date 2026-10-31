"use client";

import { useState } from "react";
import { useAiWriting } from "./ai-writing";
import { SparkleIcon } from "./ai-button";

/** Optional target role or job description for AI writing; page state only (spec 0003). */
export function TargetRoleBox() {
  const { targetRole, setTargetRole } = useAiWriting();
  const [open, setOpen] = useState(false);
  const filled = targetRole.trim().length > 0;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="target-role-body"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <SparkleIcon className="w-4 h-4 text-accent" />
          Target role or job description <span className="text-muted font-normal">(optional)</span>
        </span>
        <span className="text-xs text-muted">{filled ? "Used by AI writing" : open ? "Hide" : "Add"}</span>
      </button>
      {open && (
        <div id="target-role-body" className="px-5 pb-4 space-y-1.5">
          <label htmlFor="target-role" className="sr-only">
            Target role or job description
          </label>
          <textarea
            id="target-role"
            rows={4}
            maxLength={4000}
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="Paste the job title or the job description you are aiming for"
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground leading-relaxed placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent resize-y"
          />
          <p className="text-xs text-muted">
            AI suggestions lean toward this role. It is not saved and clears when you leave the page.
          </p>
        </div>
      )}
    </div>
  );
}
