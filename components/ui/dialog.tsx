"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** false hides the header close button (for a step that must not be left). */
  closable?: boolean;
  children: ReactNode;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  closable = true,
  children,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Move focus into the dialog, keep Tab inside it, and give focus back on close.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    // Prefer the first action in the body over the header's close button.
    const items = focusable();
    (items[1] ?? items[0])?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const list = focusable();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
      trigger?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  // Portaled to <body>: a transformed ancestor (e.g. an animate-slide-up wrapper) would
  // otherwise trap `fixed` and draw the dialog inside that section instead of the screen.
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* The dim layer covers the overlay, so it is what receives backdrop clicks. */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" aria-hidden="true" onClick={onClose} />
      <div ref={panelRef} className="relative w-full max-w-md rounded-2xl border bg-card shadow-float p-6 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2
              id="dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted">{description}</p>
            )}
          </div>
          {closable && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
