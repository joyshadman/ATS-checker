"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormContext } from "react-hook-form";
import { writeResumeSection } from "@/actions/section-writing";
import { buildAiContext, mergeSkillSuggestions, type ResumeForm } from "@/lib/resume/form";
import { AI_COOLDOWN_MS, targetKeyOf, type AiStyle, type SectionTarget } from "@/lib/resume/section-writing";
import type { SectionSuggestion } from "@/types";

// Editor AI state (spec 0003): one request at a time, one open panel, answers applied
// only for the active request id.

const WATCHDOG_MS = 100_000;
const TOO_SLOW = "The AI took too long. Try again.";
const OFFLINE = "Could not reach the server. Try again.";

export type AiStatus = "loading" | "suggestion" | "empty" | "error";

export type ActiveAi = {
  key: string;
  status: AiStatus;
  /** The target as it was when the request was sent ("Yours"). */
  snapshot: SectionTarget;
  style?: AiStyle;
  /** Started from this target's own panel (Try again or a chip), so its controls stay put. */
  retry: boolean;
  suggestion?: SectionSuggestion;
  error?: string;
};

type AiWritingValue = {
  active: ActiveAi | null;
  busy: boolean;
  /** Whole seconds left before Try again or a chip may run again. */
  cooldownLeft: number;
  targetRole: string;
  setTargetRole: (value: string) => void;
  request: (target: SectionTarget, style?: AiStyle) => void;
  accept: () => void;
  discard: () => void;
  /** Closes the panel of `key` when its target disappears from the form. */
  closeRemoved: (key: string, fallbackFocusId?: string) => void;
};

const AiWritingContext = createContext<AiWritingValue | null>(null);

/** DOM id of a target's AI button, so focus can return to it after close. */
export function aiButtonId(key: string) {
  return `ai-btn-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function focusLater(id: string, fallbackId?: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
    el?.focus();
  });
}

export function AiWritingProvider({ resumeId, children }: { resumeId: string; children: ReactNode }) {
  const { getValues, setValue } = useFormContext<ResumeForm>();
  const [active, setActive] = useState<ActiveAi | null>(null);
  const [busy, setBusy] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Refs so a double click cannot start two requests before React re-renders.
  const busyRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);
  const cooldownRef = useRef(0);
  const activeKeyRef = useRef<string | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    activeKeyRef.current = active?.key ?? null;
  }, [active]);

  // Tick the countdown while the cooldown window is open.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => () => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
  }, []);

  const release = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
    requestIdRef.current = null;
    busyRef.current = false;
    setBusy(false);
  }, []);

  // Drops a request still in flight. The server stamped its cooldown when the request
  // started, so the countdown runs from then.
  const abandon = useCallback(() => {
    if (!busyRef.current) return;
    release();
    const until = startedAtRef.current + AI_COOLDOWN_MS;
    if (until > cooldownRef.current) {
      cooldownRef.current = until;
      setCooldownUntil(until);
      setNow(Date.now());
    }
  }, [release]);

  const request = useCallback(
    (target: SectionTarget, style?: AiStyle) => {
      if (busyRef.current || Date.now() < cooldownRef.current) return;
      busyRef.current = true;
      setBusy(true);

      const key = targetKeyOf(target);
      const requestId = crypto.randomUUID();
      requestIdRef.current = requestId;
      startedAtRef.current = Date.now();
      setActive((prev) => ({ key, status: "loading", snapshot: target, style, retry: prev?.key === key }));

      const finish = (outcome: { suggestion: SectionSuggestion } | { error: string }) => {
        if (requestIdRef.current !== requestId) return; // late or abandoned answer
        release();
        const until = Date.now() + AI_COOLDOWN_MS;
        cooldownRef.current = until;
        setCooldownUntil(until);
        setNow(Date.now());
        setActive((prev) => {
          if (!prev || prev.key !== key) return prev;
          if ("error" in outcome) return { ...prev, status: "error", error: outcome.error, suggestion: undefined };
          const s = outcome.suggestion;
          const empty = s.kind === "skills" ? s.additions.length === 0 : s.unchanged;
          return { ...prev, status: empty ? "empty" : "suggestion", suggestion: s, error: undefined };
        });
      };

      watchdogRef.current = setTimeout(() => finish({ error: TOO_SLOW }), WATCHDOG_MS);

      writeResumeSection({
        resumeId,
        target,
        context: buildAiContext(getValues(), key),
        targetRole: targetRole.trim() || undefined,
        style,
        nonce: crypto.randomUUID(),
      })
        .then((result) => finish(result.success ? { suggestion: result.data } : { error: result.error }))
        .catch(() => finish({ error: OFFLINE }));
    },
    [getValues, release, resumeId, targetRole]
  );

  const close = useCallback(
    (focusKey: string | null, fallbackId?: string) => {
      abandon();
      setActive(null);
      if (focusKey) focusLater(aiButtonId(focusKey), fallbackId);
    },
    [abandon]
  );

  const accept = useCallback(() => {
    if (!active || active.status !== "suggestion" || !active.suggestion) return;
    const s = active.suggestion;
    const opts = { shouldDirty: true, shouldValidate: true } as const;

    if (s.kind === "summary") {
      setValue("summary", s.summary, opts);
    } else if (s.kind === "bullets") {
      const snapshot = active.snapshot;
      if (snapshot.kind !== "bullets") return;
      const index = getValues(snapshot.section).findIndex((entry) => entry.id === s.entryId);
      if (index === -1) {
        close(null);
        return;
      }
      setValue(
        `${snapshot.section}.${index}.bullets`,
        s.bullets.map((value) => ({ value })),
        opts
      );
    } else {
      setValue("skills", mergeSkillSuggestions(getValues("skills"), s.additions).groups, opts);
    }
    close(active.key);
  }, [active, close, getValues, setValue]);

  const discard = useCallback(() => {
    if (!active) return;
    close(active.key);
  }, [active, close]);

  const closeRemoved = useCallback(
    (key: string, fallbackFocusId?: string) => {
      if (activeKeyRef.current !== key) return;
      activeKeyRef.current = null;
      abandon();
      setActive(null);
      if (fallbackFocusId) focusLater(fallbackFocusId);
    },
    [abandon]
  );

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const value = useMemo<AiWritingValue>(
    () => ({ active, busy, cooldownLeft, targetRole, setTargetRole, request, accept, discard, closeRemoved }),
    [active, busy, cooldownLeft, targetRole, request, accept, discard, closeRemoved]
  );

  return <AiWritingContext.Provider value={value}>{children}</AiWritingContext.Provider>;
}

export function useAiWriting() {
  const ctx = useContext(AiWritingContext);
  if (!ctx) throw new Error("useAiWriting must be used within AiWritingProvider");
  return ctx;
}

/** Closes the target's panel when the component that hosts it unmounts (entry removed). */
export function useCloseOnRemove(key: string, fallbackFocusId?: string) {
  const { closeRemoved } = useAiWriting();
  const keyRef = useRef(key);
  const fallbackRef = useRef(fallbackFocusId);
  useEffect(() => {
    keyRef.current = key;
    fallbackRef.current = fallbackFocusId;
  });
  useEffect(() => () => closeRemoved(keyRef.current, fallbackRef.current), [closeRemoved]);
}
