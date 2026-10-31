"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { setResumeAppearance } from "@/actions/resume";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ResumeSheet } from "@/components/resume/viewer/resume-sheet";
import { PdfDownloadButton } from "@/components/resume/viewer/pdf-download-button";
import { usePrintTitle } from "@/components/resume/viewer/use-print-title";
import { hasResumeBody, type ResumeContent } from "@/lib/resume/content";
import { sheetFontVariables } from "@/lib/resume/fonts";
import { pdfFileTitle } from "@/lib/resume/format";
import { countSheetPlaceholders } from "@/lib/resume/placeholders";
import { LINK_STYLES, TEMPLATES, type LinkStyle, type TemplateId } from "@/lib/resume/templates";

type Props = {
  resumeId: string;
  content: ResumeContent;
  draft: ResumeContent | null;
  initialTemplateId: TemplateId;
  initialLinkStyle: LinkStyle;
  /** The draft's Accept and Discard buttons, shown above the draft sheet. */
  draftActions?: ReactNode;
};

/**
 * A setting saved optimistically (AC-3, AC-4, AC-11): it shows at once, goes back to
 * the last confirmed value if the newest save fails, and a late answer for an older
 * pick never overrides a newer one.
 */
function useSavedChoice<T extends string>(initial: T, persist: (value: T) => Promise<boolean>, failure: string) {
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

export function ResumeViewer({ resumeId, content, draft, initialTemplateId, initialLinkStyle, draftActions }: Props) {
  const [templateId, chooseTemplate, savingTemplate] = useSavedChoice<TemplateId>(
    initialTemplateId,
    async (value) => (await setResumeAppearance({ resumeId, templateId: value })).success,
    "Could not save the template. Try again."
  );
  const [linkStyle, chooseLinkStyle, savingLinkStyle] = useSavedChoice<LinkStyle>(
    initialLinkStyle,
    async (value) => (await setResumeAppearance({ resumeId, linkStyle: value })).success,
    "Could not save the link style. Try again."
  );
  // Null until the saved sheet's pages are first measured (spec 0008, AC-5).
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [draftPageCount, setDraftPageCount] = useState<number | null>(null);
  const hasBody = hasResumeBody(content);

  usePrintTitle(pdfFileTitle(content.contact.fullName));

  return (
    <div className={`space-y-6 ${sheetFontVariables}`}>
      <Card className="animate-slide-up">
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
            <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" />
            Your Resume
          </h2>
          <p className="text-sm text-muted mt-1">
            What an employer sees. Every template is one column with real text, so ATS software reads it cleanly.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5">
            <ChoiceGroup
              label="Template"
              options={TEMPLATES.map((t) => ({ id: t.id, name: t.name, line: t.description }))}
              value={templateId}
              onChange={chooseTemplate}
            />
            <ChoiceGroup
              label="Links"
              options={LINK_STYLES.map((s) => ({ id: s.id, name: s.name, line: s.tradeoff }))}
              value={linkStyle}
              onChange={chooseLinkStyle}
            />
          </div>

          <PdfDownloadButton
            resumeId={resumeId}
            ready={pageCount !== null}
            saving={savingTemplate || savingLinkStyle}
            hasBody={hasBody}
            placeholderCount={countSheetPlaceholders(content, linkStyle)}
          />

          {!hasBody && (
            <p className="rounded-xl border border-border/60 bg-surface/60 px-4 py-3 text-sm text-foreground">
              This resume has no sections yet.{" "}
              <Link
                href={`/resumes/${resumeId}/edit`}
                className="font-medium text-accent underline underline-offset-2 hover:brightness-110"
              >
                Add them in the editor
              </Link>
            </p>
          )}

          <SheetArea pageCount={pageCount}>
            <ResumeSheet
              content={content}
              templateId={templateId}
              linkStyle={linkStyle}
              highlight
              printable
              onPageCount={setPageCount}
            />
          </SheetArea>
        </CardContent>
      </Card>

      {draft && (
        <Card className="animate-slide-up">
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-gradient-success inline-block" />
              Improved Resume
            </h2>
            <p className="text-sm text-muted mt-1">A draft. Accept it to replace your sections, or discard it.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {draftActions}
            <SheetArea pageCount={draftPageCount}>
              <ResumeSheet
                content={draft}
                templateId={templateId}
                linkStyle={linkStyle}
                highlight
                onPageCount={setDraftPageCount}
              />
            </SheetArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** The muted desk the white pages sit on, with the over two pages warning (AC-17). */
function SheetArea({ pageCount, children }: { pageCount: number | null; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div role="status">
        {pageCount !== null && pageCount > 2 && (
          <p className="rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
            Your resume runs past 2 pages. Most recruiters expect 1 to 2.
          </p>
        )}
      </div>
      <div className="rounded-xl bg-surface/60 border border-border/60 p-3 sm:p-6">{children}</div>
    </div>
  );
}

type Choice<T extends string> = { id: T; name: string; line: string };

/** A radio group of option cards; arrow keys move and select within the group. */
function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = `choice-${label.toLowerCase()}`;

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    refs.current[next]?.focus();
    if (options[next].id !== value) onChange(options[next].id);
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
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => !selected && onChange(option.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
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
