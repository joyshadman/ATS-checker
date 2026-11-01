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

// Classic: Figma "Template / Classic (A4)", node 9:2. Source Serif 4, 72 px margins,
// centered name and contact, ruled uppercase headings, two line entry headers.

const entryGap = (first: boolean) => (first ? "pt-[8px]" : "pt-[10px]");

function blocks(content: ResumeContent, options: SheetOptions) {
  const { highlight } = options;
  const text = (value: string) => <Placeholders text={value} highlight={highlight} />;

  return buildBlocks(content, options, {
    header: (c, o) => (
      <div className="text-center">
        <p className="text-[30px] leading-[42px] font-semibold tracking-[0.5px]">{text(c.contact.fullName)}</p>
        <p className="pt-[6px] text-[13px] leading-[18.2px]">{joinNodes(contactItems(c.contact, o), " | ")}</p>
      </div>
    ),
    heading: (title) => (
      <div className="pt-[16px]">
        <h3 className="border-b border-sheet-rule pb-[3px] text-[13px] leading-[18.2px] font-bold tracking-[1.5px] uppercase">
          {title}
        </h3>
      </div>
    ),
    summary: (value) => <p className="pt-[8px]">{text(value)}</p>,
    experience: (e, first) => (
      <div className={entryGap(first)}>
        <Row left={<strong className="font-bold">{text(e.title)}</strong>} right={<DateText>{formatRange(e)}</DateText>} />
        <Row left={<em>{text(e.company)}</em>} right={e.location ? text(e.location) : undefined} />
      </div>
    ),
    education: (e, first) => {
      const degree = [e.degree, e.field].filter(Boolean).join(", ");
      return (
        <div className={entryGap(first)}>
          <Row left={<strong className="font-bold">{text(e.school)}</strong>} right={<DateText>{formatRange(e)}</DateText>} />
          {(degree || e.location) && <Row left={degree ? <em>{text(degree)}</em> : null} right={e.location ? text(e.location) : undefined} />}
        </div>
      );
    },
    project: (p, first) => (
      <div className={entryGap(first)}>
        <Row left={<strong className="font-bold">{text(p.name)}</strong>} right={<DateText>{formatRange(p)}</DateText>} />
        {(p.role || p.url) && (
          <Row
            left={p.role ? <em>{text(p.role)}</em> : null}
            right={p.url ? <SheetLink link={{ label: p.name, url: p.url }} options={options} /> : undefined}
          />
        )}
      </div>
    ),
    bullet: (value, first) => <Bullet text={value} highlight={highlight} className={first ? "pt-[4px]" : "pt-[3px]"} />,
    skill: (group, first) => (
      <p className={first ? "pt-[8px]" : "pt-[4px]"}>
        {group.category && <strong className="font-bold">{group.category}: </strong>}
        {skillText(group, highlight)}
      </p>
    ),
    certification: (c, first) => (
      <Row
        className={first ? "pt-[8px]" : "pt-[4px]"}
        left={
          <>
            <strong className="font-bold">{text(c.name)}</strong>
            {c.issuer && <>, {text(c.issuer)}</>}
            {c.url && <>, <SheetLink link={{ label: c.name, url: c.url }} options={options} /></>}
          </>
        }
        right={c.date ? <DateText>{certificationDate(c)}</DateText> : undefined}
      />
    ),
    languages: (list) => <p className="pt-[8px]">{languagesText(list)}</p>,
  });
}

export const classic: TemplateModule = {
  blocks,
  pageClassName: "font-sheet-classic text-[14.5px] leading-[20.3px]",
  margin: 72,
};
