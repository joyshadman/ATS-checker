import type { ResumeContent } from "@/lib/resume/content";

// Plain text rendering of a section document, stored as Resume.contentText and sent
// to the AI. Must stay deterministic: the same content always gives the same text.

type Dated = { start?: string; end?: string | null; current: boolean };

const join = (parts: (string | undefined)[], sep: string) =>
  parts.filter((p): p is string => !!p).join(sep);

function dateRange({ start, end, current }: Dated): string {
  const to = current ? "Present" : end ?? undefined;
  if (!start && !end) return "";
  if (start && to) return `(${start} to ${to})`;
  if (start) return `(${start})`;
  return `(to ${to})`;
}

function entry(header: (string | undefined)[], dates: string, bullets: string[] = []): string {
  const head = join([join(header, ", "), dates], " ");
  return [head, ...bullets.map((b) => `- ${b}`)].join("\n");
}

export function renderResumeText(content: ResumeContent): string {
  const { contact } = content;
  const blocks: string[] = [];

  blocks.push(
    join(
      [
        contact.fullName,
        join(
          [contact.email, contact.phone, contact.location, ...contact.links.map((l) => `${l.label}: ${l.url}`)],
          " | "
        ),
      ],
      "\n"
    )
  );

  const section = (heading: string, entries: string[]) => {
    if (entries.length) blocks.push([heading, ...entries].join("\n"));
  };

  if (content.summary) section("SUMMARY", [content.summary]);

  section(
    "EXPERIENCE",
    content.experience.map((e) => entry([e.title, e.company, e.location], dateRange(e), e.bullets))
  );
  section(
    "EDUCATION",
    content.education.map((e) => entry([e.degree, e.field, e.school, e.location], dateRange(e), e.bullets))
  );
  section(
    "SKILLS",
    content.skills.map((s) => join([s.category ? `${s.category}:` : undefined, s.items.join(", ")], " "))
  );
  section(
    "PROJECTS",
    content.projects.map((p) => entry([p.name, p.role, p.url], dateRange(p), p.bullets))
  );
  section(
    "CERTIFICATIONS",
    content.certifications.map((c) => entry([c.name, c.issuer, c.url], c.date ? `(${c.date})` : ""))
  );
  section(
    "LANGUAGES",
    content.languages.map((l) => entry([l.language, l.proficiency], ""))
  );

  return blocks.join("\n\n");
}
