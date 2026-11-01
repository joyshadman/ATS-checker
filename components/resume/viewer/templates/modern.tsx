import type { ResumeContent } from "@/lib/resume/content";
import { formatRange } from "@/lib/resume/format";
import {
  buildBlocks,
  Bullet,
  certificationDate,
  contactItems,
  DateText,
  joinNodes,
  languagesText,
  Placeholders,
  Row,
  SheetLink,
  skillText,
  type SheetOptions,
  type TemplateModule,
} from "@/components/resume/viewer/parts";

// Modern: Figma "Template / Modern (A4)", node 10:2. Inter, 72 px margins, large left
// aligned name, navy uppercase headings with a 3 px bar, one line entry headers with
// gray dates. Built from the spec 0007 description; spacing follows Classic's rhythm.

function blocks(content: ResumeContent, options: SheetOptions) {
  const { highlight } = options;
  const text = (value: string) => <Placeholders text={value} highlight={highlight} />;
  const rest = (parts: (string | undefined)[]) =>
    parts.filter((p): p is string => !!p).map((p, i) => <span key={i}>, {text(p)}</span>);
  const dates = (value: string) => <span className="text-sheet-muted"><DateText>{value}</DateText></span>;
  const entryGap = (first: boolean) => (first ? "pt-[8px]" : "pt-[10px]");

  return buildBlocks(content, options, {
    header: (c, o) => (
      <div>
        <p className="text-[32px] leading-[40px] font-bold tracking-[-0.5px]">{text(c.contact.fullName)}</p>
        <p className="pt-[6px] text-[13px] leading-[18.2px] text-sheet-muted">{joinNodes(contactItems(c.contact, o), " · ")}</p>
      </div>
    ),
    heading: (title) => (
      <div className="pt-[18px]">
        <h3 className="border-l-[3px] border-sheet-accent pl-[8px] text-[12.5px] leading-[18px] font-bold tracking-[1.2px] uppercase text-sheet-accent">
          {title}
        </h3>
      </div>
    ),
    summary: (value) => <p className="pt-[8px]">{text(value)}</p>,
    experience: (e, first) => (
      <Row
        className={entryGap(first)}
        left={
          <>
            <strong className="font-semibold">{text(e.title)}</strong>
            {rest([e.company, e.location])}
          </>
        }
        right={dates(formatRange(e))}
      />
    ),
    education: (e, first) => {
      const degree = [e.degree, e.field].filter(Boolean).join(", ");
      return (
        <Row
          className={entryGap(first)}
          left={
            <>
              <strong className="font-semibold">{text(degree || e.school)}</strong>
              {rest([degree ? e.school : undefined, e.location])}
            </>
          }
          right={dates(formatRange(e))}
        />
      );
    },
    project: (p, first) => (
      <Row
        className={entryGap(first)}
        left={
          <>
            <strong className="font-semibold">{text(p.name)}</strong>
            {rest([p.role])}
            {p.url && <>, <SheetLink link={{ label: p.name, url: p.url }} options={options} /></>}
          </>
        }
        right={dates(formatRange(p))}
      />
    ),
    bullet: (value, first) => <Bullet text={value} highlight={highlight} className={first ? "pt-[4px]" : "pt-[3px]"} />,
    skill: (group, first) => (
      <p className={first ? "pt-[8px]" : "pt-[4px]"}>
        {group.category && <strong className="font-semibold">{group.category}: </strong>}
        {skillText(group, highlight)}
      </p>
    ),
    certification: (c, first) => (
      <Row
        className={first ? "pt-[8px]" : "pt-[4px]"}
        left={
          <>
            <strong className="font-semibold">{text(c.name)}</strong>
            {rest([c.issuer])}
            {c.url && <>, <SheetLink link={{ label: c.name, url: c.url }} options={options} /></>}
          </>
        }
        right={c.date ? dates(certificationDate(c)) : undefined}
      />
    ),
    languages: (list) => <p className="pt-[8px]">{languagesText(list)}</p>,
  });
}

export const modern: TemplateModule = {
  blocks,
  pageClassName: "font-sheet-modern text-[14px] leading-[20px]",
  margin: 72,
};
