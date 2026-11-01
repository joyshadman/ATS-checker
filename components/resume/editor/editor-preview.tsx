"use client";

import { Component, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ChoiceGroup, SheetArea } from "@/components/resume/viewer/choices";
import { ResumeSheet } from "@/components/resume/viewer/resume-sheet";
import { AlertCircle } from "@/components/ui/icons";
import { parseResumeContent, type ResumeContent } from "@/lib/resume/content";
import { sheetFontVariables } from "@/lib/resume/fonts";
import { toContent, toPreviewContent, type ResumeForm } from "@/lib/resume/form";
import { LINK_STYLES, TEMPLATES, type LinkStyle, type TemplateId } from "@/lib/resume/templates";

const DEBOUNCE_MS = 300;

const TEMPLATE_CHOICES = TEMPLATES.map((t) => ({ id: t.id, name: t.name, line: t.description }));
const LINK_CHOICES = LINK_STYLES.map((s) => ({ id: s.id, name: s.name, line: s.tradeoff }));

/** A saved look setting: the shown value, how to pick another, and whether a save is in flight. */
export type AppearanceChoice<T extends string> = { value: T; choose: (value: T) => void; pending: boolean };

type Props = {
  template: AppearanceChoice<TemplateId>;
  linkStyle: AppearanceChoice<LinkStyle>;
  /** Bumped when the editor adopts saved or reloaded values, so the sheet skips the debounce (AC-10). */
  flush: number;
};

/** Valid form values preview exactly like the saved sheet; anything else is shown as typed (AC-4). */
function previewOf(values: ResumeForm): ResumeContent {
  try {
    return parseResumeContent(toContent(values));
  } catch {
    return toPreviewContent(values);
  }
}

/**
 * The live ATS sheet beside the editor (spec 0009). Lives in its own component so
 * watching every keystroke re renders only the preview, not the form's sections.
 */
export function EditorPreview({ template, linkStyle, flush }: Props) {
  const { getValues } = useFormContext<ResumeForm>();
  // Only a change signal: on a late mount useWatch starts from the default values,
  // so the current values are always read with getValues.
  const watched = useWatch<ResumeForm>();
  const [values, setValues] = useState<ResumeForm>(() => getValues());
  const seenFlush = useRef(flush);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const immediate = seenFlush.current !== flush;
    seenFlush.current = flush;
    const timer = setTimeout(() => setValues(getValues()), immediate ? 0 : DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [watched, flush, getValues]);

  // Measuring a long sheet must never hold up typing.
  const deferred = useDeferredValue(values);
  const content = useMemo(() => previewOf(deferred), [deferred]);
  const [pageCount, setPageCount] = useState<number | null>(null);

  return (
    <div className={`space-y-4 ${sheetFontVariables}`}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-gradient-accent inline-block" aria-hidden="true" />
          Preview
        </h2>
        <p className="text-xs text-muted">Updates as you type, unsaved changes included. Template and link picks save at once.</p>
      </div>

      <div className="space-y-2">
        <ChoiceGroup
          label="Template"
          variant="compact"
          options={TEMPLATE_CHOICES}
          value={template.value}
          onChange={template.choose}
          pending={template.pending}
        />
        <ChoiceGroup
          label="Links"
          variant="compact"
          options={LINK_CHOICES}
          value={linkStyle.value}
          onChange={linkStyle.choose}
          pending={linkStyle.pending}
        />
      </div>

      <PreviewBoundary resetKey={content}>
        <SheetArea pageCount={pageCount} className="p-2 sm:p-4">
          <ResumeSheet
            content={content}
            templateId={template.value}
            linkStyle={linkStyle.value}
            highlight={false}
            safeLinks
            onPageCount={setPageCount}
          />
        </SheetArea>
      </PreviewBoundary>
    </div>
  );
}

/** Keeps a preview render error away from the form; the next change tries again (AC-16). */
class PreviewBoundary extends Component<{ resetKey: unknown; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[EditorPreview] render failed:", error);
  }

  componentDidUpdate(prev: { resetKey: unknown }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface/60 p-4 text-sm text-foreground"
      >
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-danger" aria-hidden="true" />
        <p>The preview could not be shown. Your edits are safe; keep editing or save.</p>
      </div>
    );
  }
}
