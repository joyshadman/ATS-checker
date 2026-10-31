import { set, type FieldErrors, type Resolver } from "react-hook-form";
import type { z } from "zod";
import {
  CURRENT_SCHEMA_VERSION,
  MAX_ENTRIES,
  resumeContentSchema,
  titleSchema,
  type ResumeContent,
} from "@/lib/resume/content";
import type { SectionTarget } from "@/lib/resume/section-writing";

// Editor form shape (spec 0002). React Hook Form's useFieldArray needs arrays of
// objects and skills are typed as one text box, so the form is a thin mapping of
// ResumeContent. This file is the only place form paths map to schema paths.

export type BulletForm = { value: string };

type DatedForm = { start: string; end: string; current: boolean };

export type ExperienceForm = DatedForm & {
  id: string;
  title: string;
  company: string;
  location: string;
  bullets: BulletForm[];
};

export type EducationForm = DatedForm & {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  bullets: BulletForm[];
};

export type ProjectForm = DatedForm & {
  id: string;
  name: string;
  role: string;
  url: string;
  bullets: BulletForm[];
};

export type SkillGroupForm = { id: string; category: string; itemsText: string };
export type CertificationForm = { id: string; name: string; issuer: string; date: string; url: string };
export type LanguageForm = { id: string; language: string; proficiency: string };
export type LinkForm = { id: string; label: string; url: string };

export type ResumeForm = {
  title: string;
  contact: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    links: LinkForm[];
  };
  summary: string;
  experience: ExperienceForm[];
  education: EducationForm[];
  skills: SkillGroupForm[];
  projects: ProjectForm[];
  certifications: CertificationForm[];
  languages: LanguageForm[];
};

const MAX_SKILLS_PER_GROUP = 50;

export const OPTIONAL_SECTIONS = ["projects", "certifications", "languages"] as const;
export type OptionalSection = (typeof OPTIONAL_SECTIONS)[number];

// ───── Content → form ─────

const s = (v: string | null | undefined) => v ?? "";
const toBullets = (bullets: string[]): BulletForm[] => bullets.map((value) => ({ value }));

export function toForm(title: string, content: ResumeContent): ResumeForm {
  return {
    title,
    contact: {
      fullName: content.contact.fullName,
      email: s(content.contact.email),
      phone: s(content.contact.phone),
      location: s(content.contact.location),
      links: content.contact.links.map((l) => ({ ...l })),
    },
    summary: content.summary,
    experience: content.experience.map((e) => ({
      id: e.id,
      title: e.title,
      company: e.company,
      location: s(e.location),
      start: s(e.start),
      end: s(e.end),
      current: e.current,
      bullets: toBullets(e.bullets),
    })),
    education: content.education.map((e) => ({
      id: e.id,
      school: e.school,
      degree: s(e.degree),
      field: s(e.field),
      location: s(e.location),
      start: s(e.start),
      end: s(e.end),
      current: e.current,
      bullets: toBullets(e.bullets),
    })),
    skills: content.skills.map((g) => ({ id: g.id, category: g.category, itemsText: g.items.join(", ") })),
    projects: content.projects.map((p) => ({
      id: p.id,
      name: p.name,
      role: s(p.role),
      url: s(p.url),
      start: s(p.start),
      end: s(p.end),
      current: p.current,
      bullets: toBullets(p.bullets),
    })),
    certifications: content.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: s(c.issuer),
      date: s(c.date),
      url: s(c.url),
    })),
    languages: content.languages.map((l) => ({ id: l.id, language: l.language, proficiency: s(l.proficiency) })),
  };
}

// ───── Form → content ─────

/** Comma separated skills: trimmed, empty pieces dropped. */
export function splitSkills(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function dated<T extends DatedForm>(entry: T) {
  // Blank strings are dropped by the schema's normalization; End is absent when current.
  return { ...entry, end: entry.current ? undefined : entry.end };
}

/** Raw document for parseResumeContent / resumeContentSchema. */
export function toContent(form: ResumeForm): unknown {
  const unwrap = (bullets: BulletForm[]) => bullets.map((b) => b.value);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    contact: form.contact,
    summary: form.summary,
    experience: form.experience.map((e) => ({ ...dated(e), bullets: unwrap(e.bullets) })),
    education: form.education.map((e) => ({ ...dated(e), bullets: unwrap(e.bullets) })),
    skills: form.skills.map(({ id, category, itemsText }) => ({ id, category, items: splitSkills(itemsText) })),
    projects: form.projects.map((p) => ({ ...dated(p), bullets: unwrap(p.bullets) })),
    certifications: form.certifications,
    languages: form.languages,
  };
}

// ───── Validation ─────

const FIELD_ARRAYS = new Set([
  "contact.links",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
]);

/** Maps a schema issue path to the form field that shows it, or null for `root`. */
function toFormPath(path: PropertyKey[], form: ResumeForm): { path: string; prefix?: string } | null {
  const parts = path.map(String);

  // skills.N.items(.M) → skills.N.itemsText
  if (parts[0] === "skills" && parts[2] === "items") {
    const item = parts[3];
    return {
      path: `skills.${parts[1]}.itemsText`,
      prefix: item === undefined ? undefined : `Item ${Number(item) + 1}: `,
    };
  }

  // …bullets.N → …bullets.N.value
  const bulletAt = parts.indexOf("bullets");
  if (bulletAt !== -1 && parts.length === bulletAt + 2) {
    return { path: `${parts.join(".")}.value` };
  }

  const joined = parts.join(".");
  // A whole list (over the cap) or an id has no input to show the error on.
  if (FIELD_ARRAYS.has(joined) || parts[parts.length - 1] === "id" || bulletAt === parts.length - 1) {
    return null;
  }
  // Only map to paths that exist in the form; anything else goes to root.
  let node: unknown = form;
  for (const part of parts) {
    if (node === null || typeof node !== "object" || !(part in node)) return null;
    node = (node as Record<string, unknown>)[part];
  }
  return { path: joined };
}

function label(path: PropertyKey[]): string {
  return path.map(String).join(".");
}

/**
 * React Hook Form resolver running the same rules as the server (titleSchema plus
 * resumeContentSchema). Returns every issue as a nested errors object; issues with no
 * matching field go to `root`.
 */
export const resumeFormResolver: Resolver<ResumeForm> = (values) => {
  const errors: FieldErrors<ResumeForm> = {};
  const rootMessages: string[] = [];

  const add = (path: string, type: string, message: string) => {
    set(errors, path, { type, message });
  };

  const title = titleSchema.safeParse(values.title);
  if (!title.success) add("title", "title", title.error.issues[0]?.message ?? "Invalid");

  const content = resumeContentSchema.safeParse(toContent(values));
  if (!content.success) {
    for (const issue of (content.error as z.ZodError).issues) {
      const target = toFormPath(issue.path, values);
      if (!target) {
        rootMessages.push(issue.path.length ? `${label(issue.path)}: ${issue.message}` : issue.message);
        continue;
      }
      // Keep the first issue per field.
      const existing = target.path.split(".").reduce<unknown>(
        (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
        errors
      );
      if (existing) continue;
      add(target.path, issue.code, `${target.prefix ?? ""}${issue.message}`);
    }
  }

  if (rootMessages.length > 0) {
    add("root", "schema", rootMessages[0]);
  }

  if (Object.keys(errors).length > 0) {
    return { values: {}, errors };
  }
  return { values, errors: {} };
};

// ───── AI section writing helpers (spec 0003) ─────

const t = (value: string | undefined) => (value ?? "").trim();
const joinParts = (parts: (string | undefined)[], sep = ", ") => parts.map(t).filter(Boolean).join(sep);

function dateRange(entry: DatedForm): string {
  const start = t(entry.start);
  const end = entry.current ? "present" : t(entry.end);
  return start || end ? `(${start || "?"} to ${end || "?"})` : "";
}

/**
 * Plain text of the current (unsaved) form for the AI, leaving out Contact and the
 * target itself (it is sent separately; compressText drops repeated lines). Lenient:
 * blank fields are skipped and nothing here throws.
 */
export function buildAiContext(form: ResumeForm, excludeKey: string): string {
  const out: string[] = [];

  if (excludeKey !== "summary" && t(form.summary)) out.push("SUMMARY", t(form.summary), "");

  const dated = <E extends DatedForm & { id: string; bullets: BulletForm[] }>(
    title: string,
    list: E[],
    header: (entry: E) => string
  ) => {
    const lines: string[] = [];
    for (const entry of list) {
      if (excludeKey === `bullets:${entry.id}`) continue;
      const head = joinParts([header(entry), dateRange(entry)], " ");
      const bullets = entry.bullets.map((b) => t(b.value)).filter(Boolean);
      if (!head && bullets.length === 0) continue;
      if (head) lines.push(head);
      lines.push(...bullets.map((b) => `- ${b}`));
    }
    if (lines.length) out.push(title, ...lines, "");
  };

  dated("EXPERIENCE", form.experience, (e) => joinParts([e.title, e.company, e.location]));
  dated("EDUCATION", form.education, (e) => joinParts([e.degree, e.field, e.school, e.location]));

  if (excludeKey !== "skills") {
    const groups = form.skills
      .map((g) => ({ category: t(g.category), items: splitSkills(g.itemsText) }))
      .filter((g) => g.items.length > 0)
      .map((g) => (g.category ? `${g.category}: ${g.items.join(", ")}` : g.items.join(", ")));
    if (groups.length) out.push("SKILLS", ...groups, "");
  }

  dated("PROJECTS", form.projects, (p) => joinParts([p.name, p.role]));

  const certs = form.certifications.map((c) => joinParts([c.name, c.issuer, c.date])).filter(Boolean);
  if (certs.length) out.push("CERTIFICATIONS", ...certs, "");

  const langs = form.languages.map((l) => joinParts([l.language, l.proficiency], " ")).filter(Boolean);
  if (langs.length) out.push("LANGUAGES", ...langs, "");

  return out.join("\n").trim();
}

/** An entry counts when any of its text fields or bullets is non blank (AC-6). */
function entryCounts(entry: Record<string, unknown>): boolean {
  return Object.entries(entry).some(([key, value]) => {
    if (key === "id") return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (key === "bullets" && Array.isArray(value)) {
      return value.some((b: BulletForm) => t(b.value).length > 0);
    }
    return false;
  });
}

const hasBullet = (bullets: BulletForm[]) => bullets.some((b) => t(b.value).length > 0);

export type BulletSectionName = "experience" | "education" | "projects";

/** Why an AI button is unavailable, or null when it may run (AC-6). */
export function aiUnavailableReason(
  form: ResumeForm,
  target: { kind: "summary" } | { kind: "skills" } | { kind: "bullets"; section: BulletSectionName; index: number }
): string | null {
  switch (target.kind) {
    case "summary": {
      const any =
        t(form.summary).length > 0 ||
        [...form.experience, ...form.education, ...form.projects, ...form.certifications, ...form.languages].some(
          (e) => entryCounts(e)
        ) ||
        form.skills.some((g) => splitSkills(g.itemsText).length > 0);
      return any ? null : "Add an entry, skills, or a few words first.";
    }
    case "skills":
      return [...form.experience, ...form.projects].some((e) => entryCounts(e))
        ? null
        : "Add an experience or project first.";
    case "bullets": {
      if (target.section === "experience") {
        const e = form.experience[target.index];
        if (!e) return "";
        return t(e.title) || t(e.company) || hasBullet(e.bullets) ? null : "Add a job title or company first.";
      }
      if (target.section === "education") {
        const e = form.education[target.index];
        if (!e) return "";
        return t(e.school) || hasBullet(e.bullets) ? null : "Add a school first.";
      }
      const p = form.projects[target.index];
      if (!p) return "";
      return t(p.name) || hasBullet(p.bullets) ? null : "Add a project name first.";
    }
  }
}

/** The request target for an AI button, from the current (unsaved) form values. */
export function buildAiTarget(
  form: ResumeForm,
  target: { kind: "summary" } | { kind: "skills" } | { kind: "bullets"; section: BulletSectionName; index: number }
): SectionTarget {
  if (target.kind === "summary") return { kind: "summary", text: form.summary };
  if (target.kind === "skills") {
    return {
      kind: "skills",
      groups: form.skills
        .map((g) => ({ category: g.category, items: splitSkills(g.itemsText) }))
        .filter((g) => g.items.length > 0),
    };
  }
  const dates = (e: DatedForm) => ({
    start: e.start,
    end: e.current ? undefined : e.end,
    current: e.current,
  });
  const bullets = (list: BulletForm[]) => list.map((b) => b.value);

  if (target.section === "experience") {
    const e = form.experience[target.index];
    return {
      kind: "bullets",
      section: "experience",
      entryId: e.id,
      heading: { title: e.title, company: e.company, location: e.location, ...dates(e) },
      bullets: bullets(e.bullets),
    };
  }
  if (target.section === "education") {
    const e = form.education[target.index];
    return {
      kind: "bullets",
      section: "education",
      entryId: e.id,
      heading: { school: e.school, degree: e.degree, field: e.field, location: e.location, ...dates(e) },
      bullets: bullets(e.bullets),
    };
  }
  const p = form.projects[target.index];
  return {
    kind: "bullets",
    section: "projects",
    entryId: p.id,
    heading: { name: p.name, role: p.role, ...dates(p) },
    bullets: bullets(p.bullets),
  };
}

/**
 * Adds suggested skills (AC-3): into the group with the same category (case
 * insensitive, trimmed) or a new group at the end. Never removes, renames, or
 * reorders anything, skips skills already present, and respects the caps.
 */
export function mergeSkillSuggestions(
  current: SkillGroupForm[],
  additions: { category: string; items: string[] }[]
): { groups: SkillGroupForm[]; skipped: number } {
  const norm = (value: string) => value.trim().toLowerCase();
  const groups = current.map((g) => ({ ...g }));
  const present = new Set(groups.flatMap((g) => splitSkills(g.itemsText).map(norm)));
  let skipped = 0;

  for (const addition of additions) {
    let group = groups.find((g) => norm(g.category) === norm(addition.category));
    const fresh = addition.items.filter((item) => !present.has(norm(item)));
    if (fresh.length === 0) continue;

    if (!group) {
      if (groups.length >= MAX_ENTRIES) {
        skipped += fresh.length;
        continue;
      }
      group = { id: crypto.randomUUID(), category: addition.category.trim(), itemsText: "" };
      groups.push(group);
    }

    const room = MAX_SKILLS_PER_GROUP - splitSkills(group.itemsText).length;
    const added = fresh.slice(0, Math.max(0, room));
    skipped += fresh.length - added.length;
    if (added.length === 0) continue;

    added.forEach((item) => present.add(norm(item)));
    const base = group.itemsText.trim().replace(/,\s*$/, "");
    group.itemsText = base ? `${base}, ${added.join(", ")}` : added.join(", ");
  }

  return { groups, skipped };
}

// ───── New items (appended at the end, fresh id) ─────

const newId = () => crypto.randomUUID();
const blankDates = (): DatedForm => ({ start: "", end: "", current: false });

export const newItem = {
  link: (): LinkForm => ({ id: newId(), label: "", url: "" }),
  experience: (): ExperienceForm => ({
    id: newId(),
    title: "",
    company: "",
    location: "",
    ...blankDates(),
    bullets: [],
  }),
  education: (): EducationForm => ({
    id: newId(),
    school: "",
    degree: "",
    field: "",
    location: "",
    ...blankDates(),
    bullets: [],
  }),
  skills: (): SkillGroupForm => ({ id: newId(), category: "", itemsText: "" }),
  projects: (): ProjectForm => ({ id: newId(), name: "", role: "", url: "", ...blankDates(), bullets: [] }),
  certifications: (): CertificationForm => ({ id: newId(), name: "", issuer: "", date: "", url: "" }),
  languages: (): LanguageForm => ({ id: newId(), language: "", proficiency: "" }),
  bullet: (): BulletForm => ({ value: "" }),
};
