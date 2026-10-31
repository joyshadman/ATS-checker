"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { mergeSkillSuggestions, type ResumeForm } from "@/lib/resume/form";
import { AI_LIMIT_REACHED, PRICING_PATH } from "@/lib/ai/credits-shared";
import { splitPlaceholders } from "@/lib/resume/placeholders";
import type { AiStyle, SectionTarget } from "@/lib/resume/section-writing";
import { useAiWriting, type ActiveAi } from "./ai-writing";
import { SparkleIcon } from "./ai-button";

const STYLE_CHIPS: { style: AiStyle; label: string }[] = [
  { style: "shorter", label: "Shorter" },
  { style: "impact", label: "More impact" },
  { style: "technical", label: "More technical" },
  { style: "grammar", label: "Fix grammar only" },
];

/** Text with AI placeholders such as [X%] highlighted (no raw HTML). */
function PlaceholderText({ text }: { text: string }) {
  return (
    <>
      {splitPlaceholders(text).map((part, i) =>
        part.placeholder ? (
          <mark key={i} className="rounded px-0.5 bg-warning/20 text-warning font-semibold">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

function snapshotHasText(snapshot: SectionTarget): boolean {
  if (snapshot.kind === "summary") return snapshot.text.trim().length > 0;
  if (snapshot.kind === "bullets") return snapshot.bullets.some((b) => b.trim().length > 0);
  return false;
}

function Yours({ snapshot }: { snapshot: SectionTarget }) {
  if (snapshot.kind === "summary") {
    return snapshot.text.trim() ? (
      <p className="whitespace-pre-wrap">{snapshot.text.trim()}</p>
    ) : (
      <p className="text-muted italic">Empty</p>
    );
  }
  if (snapshot.kind === "bullets") {
    const bullets = snapshot.bullets.map((b) => b.trim()).filter(Boolean);
    return bullets.length ? (
      <ul className="list-disc pl-4 space-y-1">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    ) : (
      <p className="text-muted italic">No bullets yet</p>
    );
  }
  const groups = snapshot.groups.filter((g) => g.items.length > 0);
  return groups.length ? (
    <ul className="space-y-1">
      {groups.map((g, i) => (
        <li key={i}>
          <span className="font-medium">{g.category.trim() || "Ungrouped"}:</span> {g.items.join(", ")}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-muted italic">No skills yet</p>
  );
}

function Suggested({ active }: { active: ActiveAi }) {
  const { getValues } = useFormContext<ResumeForm>();
  const s = active.suggestion;
  if (!s) return null;

  if (s.kind === "summary") {
    return (
      <p className="whitespace-pre-wrap">
        <PlaceholderText text={s.summary} />
      </p>
    );
  }
  if (s.kind === "bullets") {
    return (
      <ul className="list-disc pl-4 space-y-1">
        {s.bullets.map((b, i) => (
          <li key={i}>
            <PlaceholderText text={b} />
          </li>
        ))}
      </ul>
    );
  }
  const { skipped } = mergeSkillSuggestions(getValues("skills"), s.additions);
  return (
    <div className="space-y-2">
      {s.additions.map((group, i) => (
        <div key={i} className="space-y-1">
          <p className="text-xs font-medium text-muted">{group.category.trim() || "Ungrouped"}</p>
          <ul className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <li key={item} className="rounded-full border border-success/25 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                + <PlaceholderText text={item} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {skipped > 0 && (
        <p className="text-xs text-muted">Some suggestions were skipped because a limit was reached.</p>
      )}
    </div>
  );
}

/** Inline AI suggestion for one target; renders only while that target is active. */
export function SuggestionPanel({ aiKey, buildTarget }: { aiKey: string; buildTarget: () => SectionTarget }) {
  const { active, busy, outOfUses, cooldownLeft, request, accept, discard } = useAiWriting();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mine = active?.key === aiKey ? active : null;
  const status = mine?.status;

  // Focus moves to the panel heading when an answer, empty result, or error arrives.
  useEffect(() => {
    if (status && status !== "loading") headingRef.current?.focus();
  }, [status]);

  if (!mine) return null;

  const waiting = busy || cooldownLeft > 0 || outOfUses;
  // The server blocked the request: no AI uses left (spec 0004), so retrying cannot help.
  const limited = mine.status === "error" && mine.error === AI_LIMIT_REACHED;
  const retryLabel = cooldownLeft > 0 ? `Try again in ${cooldownLeft}s` : "Try again";
  const loading = mine.status === "loading";
  // On a retry the pressed control stays rendered (unavailable) so keyboard focus is not lost.
  const showControls = !loading || mine.retry;
  const showChips = mine.snapshot.kind !== "skills" && snapshotHasText(mine.snapshot) && showControls && !limited;
  const headingId = `${aiKey.replace(/[^a-zA-Z0-9_-]/g, "-")}-ai-heading`;

  const retry = (style?: AiStyle) => {
    if (!waiting) request(buildTarget(), style);
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-accent/25 bg-accent/5 p-4 space-y-4 animate-fade-in"
    >
      <h3
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="flex items-center gap-2 text-sm font-semibold text-foreground focus:outline-none"
      >
        <SparkleIcon className="w-4 h-4 text-accent" />
        AI suggestion
      </h3>

      {mine.status === "loading" && (
        <div role="status" className="space-y-2">
          <p className="text-sm text-muted">Writing...</p>
          <div className="h-3 w-full rounded bg-surface animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-surface animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-surface animate-pulse" />
        </div>
      )}

      {mine.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {mine.error}
          {limited && (
            <>
              {" "}
              <Link href={PRICING_PATH} prefetch={false} className="font-semibold underline underline-offset-2">
                See pricing
              </Link>
            </>
          )}
        </p>
      )}

      {mine.status === "empty" && (
        <p role="status" className="text-sm text-muted">
          {mine.snapshot.kind === "skills" ? "No new skills found." : "No changes suggested."}
        </p>
      )}

      {mine.status === "suggestion" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-foreground">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Yours</p>
            <div className="rounded-lg border border-border/60 bg-card p-3">
              <Yours snapshot={mine.snapshot} />
            </div>
          </div>
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Suggested</p>
            <div className="rounded-lg border border-accent/30 bg-card p-3">
              <Suggested active={mine} />
            </div>
          </div>
        </div>
      )}

      {showChips && (
        <div role="group" aria-label="Rewrite style" className="flex flex-wrap gap-1.5">
          {STYLE_CHIPS.map((chip) => (
            <button
              key={chip.style}
              type="button"
              aria-pressed={mine.style === chip.style}
              aria-disabled={waiting}
              onClick={() => retry(chip.style)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                mine.style === chip.style
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:text-foreground hover:bg-surface"
              } ${waiting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {showControls && (
        <div className="flex flex-wrap gap-2">
          {mine.status === "suggestion" && (
            <Button type="button" size="sm" onClick={accept}>
              Accept
            </Button>
          )}
          {!limited && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-disabled={waiting}
              className={waiting ? "opacity-50 cursor-not-allowed" : ""}
              onClick={() => retry(mine.style)}
            >
              {retryLabel}
            </Button>
          )}
          {!loading && (
            <Button type="button" size="sm" variant="ghost" onClick={discard}>
              Discard
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
