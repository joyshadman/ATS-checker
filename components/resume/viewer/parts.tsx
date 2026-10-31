import { Fragment, type ReactNode } from "react";
import type { ResumeContent } from "@/lib/resume/content";
import { formatMonth, linkText } from "@/lib/resume/format";
import { splitPlaceholders } from "@/lib/resume/placeholders";
import type { LinkStyle } from "@/lib/resume/templates";

// Shared building blocks for the resume sheet templates (spec 0007). No hooks, so
// they render in server and client components alike.

export type SheetBlockKind = "header" | "summary" | "heading" | "entryHead" | "bullet" | "line";

/** One unbreakable piece of the sheet; pagination only decides which page it sits on. */
export type SheetBlock = {
  key: string;
  kind: SheetBlockKind;
  /** Moves to the next page together with the block after it (AC-18). */
  keepWithNext: boolean;
  node: ReactNode;
};

export type SheetOptions = { linkStyle: LinkStyle; highlight: boolean };

export type TemplateModule = {
  blocks: (content: ResumeContent, options: SheetOptions) => SheetBlock[];
  /** Font, base type size, and line height of the page. */
  pageClassName: string;
  /** Page margin in px on every side. */
  margin: number;
};

type Experience = ResumeContent["experience"][number];
type Education = ResumeContent["education"][number];
type Project = ResumeContent["projects"][number];
type SkillGroup = ResumeContent["skills"][number];
type Certification = ResumeContent["certifications"][number];
type Language = ResumeContent["languages"][number];

// ───── Inline parts ─────

/** Text with [placeholders] wrapped in <mark> when highlighting (AC-7). */
export function Placeholders({ text, highlight }: { text: string; highlight: boolean }) {
  if (!highlight) return <>{text}</>;
  return (
    <>
      {splitPlaceholders(text).map((part, i) =>
        part.placeholder ? (
          <mark key={i} className="bg-sheet-mark text-sheet-ink px-[2px] box-decoration-clone">
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        )
      )}
    </>
  );
}

export function SheetLink({ link, style }: { link: { label: string; url: string }; style: LinkStyle }) {
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-inherit no-underline">
      {linkText(link, style)}
    </a>
  );
}

export function DateText({ children }: { children: string }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

/** A left and right aligned line, e.g. title and dates; the left side wraps on its own. */
export function Row({ left, right, className = "" }: { left: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex justify-between items-start gap-x-4 ${className}`}>
      <div className="min-w-0">{left}</div>
      {right ? <div className="shrink-0 whitespace-nowrap text-right">{right}</div> : null}
    </div>
  );
}

/** One bullet as its own list, spaced so consecutive bullets read as one list. */
export function Bullet({ text, highlight, className = "" }: { text: string; highlight: boolean; className?: string }) {
  return (
    <ul className={`list-disc pl-[18px] marker:text-sheet-ink ${className}`}>
      <li>
        <Placeholders text={text} highlight={highlight} />
      </li>
    </ul>
  );
}

/** Interleaves nodes with a separator string, skipping empty ones. */
export function joinNodes(nodes: ReactNode[], separator: string): ReactNode[] {
  return nodes
    .filter((n) => n !== null && n !== undefined && n !== "")
    .flatMap((n, i) => (i === 0 ? [<Fragment key={i}>{n}</Fragment>] : [<Fragment key={`s${i}`}>{separator}</Fragment>, <Fragment key={i}>{n}</Fragment>]));
}

/** Email, phone, location, then each contact link in the chosen style. */
export function contactItems(contact: ResumeContent["contact"], { linkStyle, highlight }: SheetOptions): ReactNode[] {
  return [
    contact.email,
    contact.phone,
    contact.location ? <Placeholders text={contact.location} highlight={highlight} /> : undefined,
    ...contact.links.map((link) => <SheetLink key={link.id} link={link} style={linkStyle} />),
  ];
}

export function skillText(group: SkillGroup, highlight: boolean): ReactNode {
  return joinNodes(
    group.items.map((item, i) => <Placeholders key={i} text={item} highlight={highlight} />),
    ", "
  );
}

export function languagesText(languages: Language[]): string {
  return languages.map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language)).join(", ");
}

export function certificationDate(c: Certification): string {
  return c.date ? formatMonth(c.date) : "";
}

// ───── Block builder ─────

/** How one template draws each piece; `first` is true for the first item of its section. */
export type TemplateRenderers = {
  header: (content: ResumeContent, options: SheetOptions) => ReactNode;
  heading: (title: string) => ReactNode;
  summary: (text: string, options: SheetOptions) => ReactNode;
  experience: (entry: Experience, first: boolean, options: SheetOptions) => ReactNode;
  education: (entry: Education, first: boolean, options: SheetOptions) => ReactNode;
  project: (entry: Project, first: boolean, options: SheetOptions) => ReactNode;
  bullet: (text: string, first: boolean, options: SheetOptions) => ReactNode;
  skill: (group: SkillGroup, first: boolean, options: SheetOptions) => ReactNode;
  certification: (entry: Certification, first: boolean, options: SheetOptions) => ReactNode;
  languages: (languages: Language[], options: SheetOptions) => ReactNode;
};

/**
 * The resume as an ordered flat list of blocks. The section order is fixed here, the
 * same for every template (AC-2): Contact, Summary, Experience, Education, Skills,
 * Projects, Certifications, Languages. Empty sections are skipped.
 */
export function buildBlocks(content: ResumeContent, options: SheetOptions, r: TemplateRenderers): SheetBlock[] {
  const blocks: SheetBlock[] = [
    { key: "header", kind: "header", keepWithNext: false, node: r.header(content, options) },
  ];

  const heading = (key: string, title: string) =>
    blocks.push({ key: `h-${key}`, kind: "heading", keepWithNext: true, node: r.heading(title) });

  const entries = <T extends { id: string; bullets: string[] }>(
    key: string,
    title: string,
    list: T[],
    head: (entry: T, first: boolean, options: SheetOptions) => ReactNode
  ) => {
    if (list.length === 0) return;
    heading(key, title);
    list.forEach((entry, i) => {
      blocks.push({ key: entry.id, kind: "entryHead", keepWithNext: true, node: head(entry, i === 0, options) });
      entry.bullets.forEach((text, j) =>
        blocks.push({ key: `${entry.id}-${j}`, kind: "bullet", keepWithNext: false, node: r.bullet(text, j === 0, options) })
      );
    });
  };

  if (content.summary) {
    heading("summary", "Summary");
    blocks.push({ key: "summary", kind: "summary", keepWithNext: false, node: r.summary(content.summary, options) });
  }

  entries("experience", "Experience", content.experience, r.experience);
  entries("education", "Education", content.education, r.education);

  if (content.skills.length) {
    heading("skills", "Skills");
    content.skills.forEach((group, i) =>
      blocks.push({ key: group.id, kind: "line", keepWithNext: false, node: r.skill(group, i === 0, options) })
    );
  }

  entries("projects", "Projects", content.projects, r.project);

  if (content.certifications.length) {
    heading("certifications", "Certifications");
    content.certifications.forEach((c, i) =>
      blocks.push({ key: c.id, kind: "line", keepWithNext: false, node: r.certification(c, i === 0, options) })
    );
  }

  if (content.languages.length) {
    heading("languages", "Languages");
    blocks.push({ key: "languages", kind: "line", keepWithNext: false, node: r.languages(content.languages, options) });
  }

  return blocks;
}
