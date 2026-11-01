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

// Compact: Figma "Template / Compact (A4)", node 11:2. IBM Plex Sans, 48 px margins,
// name and contact on one ruled line, small headings, one line entry headers.

const SEP = " | ";

function blocks(content: ResumeContent, options: SheetOptions) {
  const { highlight } = options;
  const text = (value: string) => <Placeholders text={value} highlight={highlight} />;
  const rest = (parts: (string | undefined)[]) =>
    parts.filter((p): p is string => !!p).map((p, i) => <span key={i}>{SEP}{text(p)}</span>);

  return buildBlocks(content, options, {
    header: (c, o) => (
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 border-b border-sheet-rule pb-[7px]">
        <p className="text-[22px] leading-[28.6px] font-bold">{text(c.contact.fullName)}</p>
        <p className="text-[11.5px] leading-[14.95px] text-right">{joinNodes(contactItems(c.contact, o), SEP)}</p>
      </div>
    ),
    heading: (title) => (
      <h3 className="pt-[10px] text-[11.5px] leading-[14.95px] font-bold tracking-[1px] uppercase">{title}</h3>
    ),
    summary: (value) => <p className="pt-[4px]">{text(value)}</p>,
    experience: (e, first) => (
      <Row
        className={first ? "pt-[4px]" : "pt-[6px]"}
        left={
          <>
            <strong className="font-bold">{text(e.title)}</strong>
            {rest([e.company, e.location])}
          </>
        }
        right={<DateText>{formatRange(e)}</DateText>}
      />
    ),
    education: (e, first) => {
      const degree = [e.degree, e.field].filter(Boolean).join(", ");
      return (
        <Row
          className={first ? "pt-[4px]" : "pt-[6px]"}
          left={
            <>
              <strong className="font-bold">{text(degree || e.school)}</strong>
              {rest([degree ? e.school : undefined, e.location])}
            </>
          }
          right={<DateText>{formatRange(e)}</DateText>}
        />
      );
    },
    project: (p, first) => (
      <Row
        className={first ? "pt-[4px]" : "pt-[6px]"}
        left={
          <>
            <strong className="font-bold">{text(p.name)}</strong>
            {rest([p.role])}
            {p.url && <>{SEP}<SheetLink link={{ label: p.name, url: p.url }} options={options} /></>}
          </>
        }
        right={<DateText>{formatRange(p)}</DateText>}
      />
    ),
    bullet: (value, first) => <Bullet text={value} highlight={highlight} className={first ? "pt-[4px]" : "pt-px"} />,
    skill: (group) => (
      <p className="pt-[4px]">
        {group.category && <strong className="font-bold">{group.category}: </strong>}
        {skillText(group, highlight)}
      </p>
    ),
    certification: (c) => (
      <Row
        className="pt-[4px]"
        left={
          <>
            <strong className="font-bold">{text(c.name)}</strong>
            {rest([c.issuer])}
            {c.url && <>{SEP}<SheetLink link={{ label: c.name, url: c.url }} options={options} /></>}
          </>
        }
        right={c.date ? <DateText>{certificationDate(c)}</DateText> : undefined}
      />
    ),
    languages: (list) => <p className="pt-[4px]">{languagesText(list)}</p>,
  });
}

export const compact: TemplateModule = {
  blocks,
  pageClassName: "font-sheet-compact text-[13px] leading-[16.9px]",
  margin: 48,
};
