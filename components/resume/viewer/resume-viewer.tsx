"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { setResumeAppearance } from "@/actions/resume";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChoiceGroup, SheetArea, useSavedChoice } from "@/components/resume/viewer/choices";
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
