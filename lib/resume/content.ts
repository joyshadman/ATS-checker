import { z } from "zod";

// Section document stored in Resume.content (spec 0001). Every write must go
// through parseResumeContent; never cast a raw Prisma JsonValue to ResumeContent.

export const CURRENT_SCHEMA_VERSION = 1;

export const MAX_ENTRIES = 30;
export const MAX_BULLETS = 12;
export const MAX_LINKS = 10;
const MAX_IMPROVE_BULLETS = 40;

// Error messages the UI matches on (spec 0002). Throw these, never retyped strings.
export const RESUME_NOT_FOUND = "Resume not found";
export const RESUME_UNAUTHORIZED = "Unauthorized";
export const SECTIONS_UNREADABLE = "This resume's sections could not be read";
export const RESUME_CONFLICT = "This resume changed elsewhere. Reload to get the latest.";

/** The single title rule: create, save, and the editor forms all use it. */
export const titleSchema = z.string().trim().min(1, "Title is required").max(200);

const SECTION_KEYS = [
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
] as const;

// ───── Normalization ─────

// Trims every string and drops object keys whose string value ends up empty, so a
// form can send blank inputs. Array items are trimmed but kept, so an empty bullet
// still fails validation instead of silently disappearing.
function normalize(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value)) {
      const v = normalize(raw);
      if (v === "") continue;
      out[key] = v;
    }
    return out;
  }
  return value;
}

// ───── Field helpers ─────

const requiredError = (iss: { input: unknown }) =>
  iss.input === undefined ? "Required" : undefined;

const req = (max: number) =>
  z.string({ error: requiredError }).min(1, "Required").max(max);

const opt = (max: number) => z.string().max(max).optional();

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

const url = z
  .string()
  .max(500)
  .refine((v) => {
    try {
      const { protocol } = new URL(v);
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be an http or https URL");

const id = req(64);

const bullets = z
  .array(z.string().min(1, "Required").max(500))
  .max(MAX_BULLETS)
  .default([]);

const list = <T extends z.ZodType>(item: T) => z.array(item).max(MAX_ENTRIES).default([]);

const dateRange = {
  start: yearMonth.optional(),
  end: yearMonth.nullable().optional(),
  current: z.boolean().default(false),
};

type Dated = { start?: string; end?: string | null; current: boolean };

function checkDates(entry: Dated, ctx: z.RefinementCtx) {
  if (entry.current && entry.end) {
    ctx.addIssue({ code: "custom", path: ["end"], message: "Must be empty when current" });
  }
  if (entry.start && entry.end && entry.end < entry.start) {
    ctx.addIssue({ code: "custom", path: ["end"], message: "Must not be before start" });
  }
}

// ───── Schema v1 ─────

const contactSchema = z.object({
  fullName: req(120),
  email: z.email("Invalid email").optional(),
  phone: opt(40),
  location: opt(120),
  links: z.array(z.object({ id, label: req(40), url })).max(MAX_LINKS).default([]),
});

const experienceSchema = z
  .object({
    id,
    title: req(200),
    company: req(200),
    location: opt(120),
    ...dateRange,
    bullets,
  })
  .superRefine(checkDates);

const educationSchema = z
  .object({
    id,
    school: req(200),
    degree: opt(200),
    field: opt(200),
    location: opt(120),
    ...dateRange,
    bullets,
  })
  .superRefine(checkDates);

const skillGroupSchema = z.object({
  id,
  category: z.string().max(60).default(""),
  items: z.array(z.string().min(1, "Required").max(60)).min(1, "Required").max(50),
});

const projectSchema = z
  .object({
    id,
    name: req(200),
    role: opt(200),
    url: url.optional(),
    ...dateRange,
    bullets,
  })
  .superRefine(checkDates);

const certificationSchema = z.object({
  id,
  name: req(200),
  issuer: opt(200),
  date: yearMonth.optional(),
  url: url.optional(),
});

const languageSchema = z.object({
  id,
  language: req(60),
  proficiency: opt(60),
});

const resumeContentV1 = z
  .object({
    schemaVersion: z.literal(1),
    contact: contactSchema,
    summary: z.string().max(3000).default(""),
    experience: list(experienceSchema),
    education: list(educationSchema),
    skills: list(skillGroupSchema),
    projects: list(projectSchema),
    certifications: list(certificationSchema),
    languages: list(languageSchema),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    const check = (entryId: string, path: (string | number)[]) => {
      if (seen.has(entryId)) {
        ctx.addIssue({ code: "custom", path: [...path, "id"], message: "Duplicate id" });
      }
      seen.add(entryId);
    };
    doc.contact.links.forEach((l, i) => check(l.id, ["contact", "links", i]));
    for (const key of SECTION_KEYS) {
      doc[key].forEach((e, i) => check(e.id, [key, i]));
    }
  });

export const resumeContentSchema = z.preprocess(normalize, resumeContentV1);

export type ResumeContent = z.output<typeof resumeContentV1>;

// ───── Parsing ─────

/** First Zod issue as `<path>: <message>`, the error shape every action returns. */
export function zodIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  return issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message;
}

/** Validate, normalize, and upgrade a stored or submitted document. Throws on failure. */
export function parseResumeContent(raw: unknown): ResumeContent {
  const version =
    raw !== null && typeof raw === "object" ? (raw as { schemaVersion?: unknown }).schemaVersion : undefined;

  switch (version) {
    case 1: {
      const result = resumeContentSchema.safeParse(raw);
      if (!result.success) throw new Error(zodIssueMessage(result.error));
      return result.data;
    }
    default:
      throw new Error("schemaVersion: Unsupported schema version");
  }
}

export function emptyResumeContent(contact: { fullName: string; email?: string }): ResumeContent {
  return parseResumeContent({ schemaVersion: CURRENT_SCHEMA_VERSION, contact });
}

/** True when the document has a summary or at least one section entry. */
export function hasResumeBody(content: ResumeContent): boolean {
  return content.summary.length > 0 || SECTION_KEYS.some((key) => content[key].length > 0);
}

// ───── Improve merge ─────

export type ImproveEntry = { id: string; bullets: string[] };

export type StructuredImproveResult = {
  summary?: unknown;
  entries?: unknown;
  keyChanges?: unknown;
};

/** Experience then project entries with bullets, stopping before 40 bullets total. */
export function selectImproveEntries(content: ResumeContent): ImproveEntry[] {
  const selected: ImproveEntry[] = [];
  let total = 0;
  for (const entry of [...content.experience, ...content.projects]) {
    if (entry.bullets.length === 0) continue;
    if (total + entry.bullets.length > MAX_IMPROVE_BULLETS) break;
    selected.push({ id: entry.id, bullets: entry.bullets });
    total += entry.bullets.length;
  }
  return selected;
}

function validBullets(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_BULLETS) return null;
  const out: string[] = [];
  for (const b of value) {
    if (typeof b !== "string") return null;
    const t = b.trim();
    if (t.length < 1 || t.length > 500) return null;
    out.push(t);
  }
  return out;
}

/**
 * Applies an AI rewrite to a copy of `content`. Only the summary and the bullets of
 * entries that were sent change; any invalid piece keeps the original text.
 */
export function mergeImprovement(content: ResumeContent, response: StructuredImproveResult): ResumeContent {
  const sent = new Set(selectImproveEntries(content).map((e) => e.id));
  const rewrites = new Map<string, string[]>();

  if (Array.isArray(response.entries)) {
    for (const raw of response.entries) {
      if (raw === null || typeof raw !== "object") continue;
      const { id: entryId, bullets: rawBullets } = raw as { id?: unknown; bullets?: unknown };
      if (typeof entryId !== "string" || !sent.has(entryId)) continue;
      const valid = validBullets(rawBullets);
      if (valid) rewrites.set(entryId, valid);
    }
  }

  const summary =
    typeof response.summary === "string" &&
    response.summary.trim().length > 0 &&
    response.summary.trim().length <= 3000
      ? response.summary.trim()
      : content.summary;

  const apply = <T extends { id: string; bullets: string[] }>(entry: T): T => {
    const next = rewrites.get(entry.id);
    return next ? { ...entry, bullets: next } : entry;
  };

  return parseResumeContent({
    ...content,
    summary,
    experience: content.experience.map(apply),
    projects: content.projects.map(apply),
  });
}
