import type { ResumeContent } from "@/lib/resume/content";
import type { LinkStyle, TemplateId } from "@/lib/resume/templates";
import type { TemplateModule } from "@/components/resume/viewer/parts";
import { PaginatedSheet } from "@/components/resume/viewer/paginated-sheet";
import { classic } from "@/components/resume/viewer/templates/classic";
import { modern } from "@/components/resume/viewer/templates/modern";
import { compact } from "@/components/resume/viewer/templates/compact";

const TEMPLATE_MODULES: Record<TemplateId, TemplateModule> = { classic, modern, compact };

/**
 * A resume as A4 pages in one template (spec 0007). PDF export (scope feature 7)
 * reuses this with `highlight={false}`.
 */
export function ResumeSheet({
  content,
  templateId,
  linkStyle,
  highlight,
  onPageCount,
  printable,
}: {
  content: ResumeContent;
  templateId: TemplateId;
  linkStyle: LinkStyle;
  highlight: boolean;
  onPageCount?: (count: number) => void;
  /** Also render the print copy the PDF export prints (spec 0008). */
  printable?: boolean;
}) {
  return (
    <PaginatedSheet
      content={content}
      template={TEMPLATE_MODULES[templateId]}
      linkStyle={linkStyle}
      highlight={highlight}
      onPageCount={onPageCount}
      printable={printable}
    />
  );
}
