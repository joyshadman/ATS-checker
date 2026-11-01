"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";

// Shared by the detail page viewer (spec 0007) and the editor preview (spec 0009).

/**
 * A setting saved optimistically (spec 0007 AC-3, AC-4, AC-11): it shows at once, goes
 * back to the last confirmed value if the newest save fails, and a late answer for an
 * older pick never overrides a newer one.
 */
export function useSavedChoice<T extends string>(initial: T, persist: (value: T) => Promise<boolean>, failure: string) {
  const { toast } = useToast();
  const [shown, setShown] = useState(initial);
  const [pending, setPending] = useState(false);
  const state = useRef({ latest: 0, confirmed: 0, saved: initial, latestSettled: true });

  async function choose(value: T) {
    const s = state.current;
    const ticket = ++s.latest;
    s.latestSettled = false;
    setShown(value);
    setPending(true);

    const ok = await persist(value).catch(() => false);
    if (ok && ticket > s.confirmed) {
      s.confirmed = ticket;
      s.saved = value;
    }

    if (ticket === s.latest) {
      s.latestSettled = true;
      setPending(false);
      if (!ok) {
        setShown(s.saved);
        toast(failure, "error");
      }
    } else if (ok && s.latestSettled && ticket === s.confirmed) {
      // The newest pick already failed and reverted; this older one is what the server holds.
      setShown(s.saved);
    }
  }

  return [shown, choose, pending] as const;
}

/** The muted desk the white pages sit on, with the over two pages warning (spec 0007 AC-17). */
export function SheetArea({
  pageCount,
  children,
  className = "",
}: {
  pageCount: number | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="space-y-4">
      <div role="status">
        {pageCount !== null && pageCount > 2 && (
          <p className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            Your resume runs past 2 pages. Most recruiters expect 1 to 2.
          </p>
        )}
      </div>
      <div className={`rounded-xl bg-surface/60 border border-border/60 ${className || "p-3 sm:p-6"}`}>{children}</div>
    </div>
  );
}

export type Choice<T extends string> = { id: T; name: string; line: string };

/**
 * A radio group; arrow keys move and select within the group. `cards` shows each
 * option's line under its name, `compact` is a segmented row with the line as a
 * tooltip and screen reader description (spec 0009, AC-5).
 */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  variant = "cards",
  pending = false,
}: {
  label: string;
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "cards" | "compact";
  /** Shows a quiet "Saving..." note while the newest pick is not saved yet. */
  pending?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const labelId = `${baseId}-label`;

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    refs.current[next]?.focus();
    if (options[next].id !== value) onChange(options[next].id);
  }

  const radioProps = (option: Choice<T>, i: number) => {
    const selected = option.id === value;
    return {
      ref: (el: HTMLButtonElement | null) => {
        refs.current[i] = el;
      },
      type: "button" as const,
      role: "radio",
      "aria-checked": selected,
      tabIndex: selected ? 0 : -1,
      onClick: () => !selected && onChange(option.id),
      onKeyDown: (e: KeyboardEvent) => onKeyDown(e, i),
    };
  };

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p id={labelId} className="w-14 shrink-0 text-xs font-medium text-muted uppercase tracking-wider">
          {label}
        </p>
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className="inline-flex flex-wrap gap-1 rounded-xl border border-border/60 bg-surface/60 p-1"
        >
          {options.map((option, i) => {
            const selected = option.id === value;
            const lineId = `${baseId}-${option.id}`;
            return (
              <button
                key={option.id}
                {...radioProps(option, i)}
                title={option.line}
                aria-describedby={lineId}
                className={`rounded-lg px-3 py-1.5 min-h-9 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  selected
                    ? "bg-card text-foreground shadow-sm ring-1 ring-accent/60"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                {option.name}
              </button>
            );
          })}
        </div>
        {/* Outside the buttons, so each line is read once as a description, not as part of the name. */}
        <div hidden>
          {options.map((option) => (
            <span key={option.id} id={`${baseId}-${option.id}`}>
              {option.line}
            </span>
          ))}
        </div>
        <span aria-live="polite" className="text-xs text-muted">
          {pending ? "Saving..." : ""}
        </span>
      </div>
    );
  }

  return (
    <div>
      <p id={labelId} className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((option, i) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              {...radioProps(option, i)}
              className={`text-left rounded-xl border px-4 py-3 min-h-11 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                selected
                  ? "border-accent bg-accent/10 shadow-sm"
                  : "border-border/60 bg-surface/60 hover:bg-card-hover hover:border-border"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-accent" : "border-muted/60"
                  }`}
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                </span>
                {option.name}
              </span>
              <span className="mt-1 block text-xs text-muted leading-relaxed">{option.line}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
