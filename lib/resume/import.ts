import { z } from "zod";
import type { AICallOptions } from "@/lib/ai/client";
import {
  CURRENT_SCHEMA_VERSION,
  hasResumeBody,
  MAX_BULLETS,
  MAX_ENTRIES,
  MAX_LINKS,
  parseResumeContent,
  type ResumeContent,
} from "@/lib/resume/content";

// Resume import (spec 0006): budget, messages, the notice schema, and the cleaner that
// turns a raw AI answer into a valid section document. Pure: no Prisma, no "use server".

// ───── Budget and messages ─────

/** How much of the trimmed upload text the AI reads (AC-7). */
export const IMPORT_MAX_CHARS = 15000;
/** A copy created this recently blocks another import of the same upload (AC-13). */
export const IMPORT_RECENT_MS = 120_000;
export const IMPORT_COOLDOWN_MS = 3000;

export const IMPORT_AI_OPTIONS = {
  maxTokens: 5000,
  timeoutMs: 90_000,
  retries: 0,
  compress: false,
} as const satisfies AICallOptions;

export const IMPORT_HAS_SECTIONS = "This resume already has sections";
export const IMPORT_NO_TEXT = "This upload has no text to import";
export const IMPORT_JUST_FINISHED = "An import of this resume just finished. Open it from your Resumes list.";
export const IMPORT_EMPTY = "The AI could not find resume sections in this text. Try again.";
export const IMPORT_UNUSABLE = "The AI answer could not be used. Try again.";
export const IMPORT_SAVE_FAILED = "Could not save the imported resume. Try again.";
export const IMPORT_TRUNCATED_LINE = "Your upload was longer than the import can read, so the end may be missing.";

const TITLE_SUFFIX = " (editable)";

/** `<upload title> (editable)`, at most 200 characters in total (AC-3). */
export function importCopyTitle(uploadTitle: string): string {
  return uploadTitle.slice(0, 200 - TITLE_SUFFIX.length).trimEnd() + TITLE_SUFFIX;
}

// ───── Notice ─────

const MAX_NOTICE_ITEMS = 40;
const MAX_NOTICE_ITEM = 2000;
const MAX_NOTICE_TOTAL = 20000;
const NOTICE_MORE = "More text could not be shown.";

export const importNoticeSchema = z
  .object({
    schemaVersion: z.literal(1),
    leftover: z.array(z.string().min(1).max(MAX_NOTICE_ITEM)).max(MAX_NOTICE_ITEMS),
    truncated: z.boolean(),
  })
  .refine((n) => n.leftover.reduce((sum, item) => sum + item.length, 0) <= MAX_NOTICE_TOTAL, {
    message: "Notice too long",
  });

export type ImportNotice = z.output<typeof importNoticeSchema>;

/** The stored notice, or null when there is none or it fails the schema (logged). */
export function readImportNotice(resumeId: string, raw: unknown): ImportNotice | null {
  if (raw === null || raw === undefined) return null;
  const result = importNoticeSchema.safeParse(raw);
  if (result.success) return result.data;
  console.error(`[Import] importNotice of ${resumeId} failed the schema:`, result.error.issues[0]);
  return null;
}

/** Cuts at the last space at or before `max`, or hard at `max` when there is none. */
function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const space = slice.lastIndexOf(" ");
  return (space > 0 ? slice.slice(0, space) : slice).trimEnd();
}

/** Splits long items, then keeps items in order while both notice limits hold. */
export function limitNotice(items: string[]): string[] {
  const parts: string[] = [];
  for (const item of items) {
    let rest = item.trim();
    while (rest.length > MAX_NOTICE_ITEM) {
      const part = cutAtWord(rest, MAX_NOTICE_ITEM);
      parts.push(part);
      rest = rest.slice(part.length).trim();
    }
    if (rest) parts.push(rest);
  }

  const total = parts.reduce((sum, p) => sum + p.length, 0);
  if (parts.length <= MAX_NOTICE_ITEMS && total <= MAX_NOTICE_TOTAL) return parts;

  const kept: string[] = [];
  let used = NOTICE_MORE.length;
  for (const part of parts) {
    if (kept.length + 1 >= MAX_NOTICE_ITEMS || used + part.length > MAX_NOTICE_TOTAL) break;
    kept.push(part);
    used += part.length;
  }
  kept.push(NOTICE_MORE);
  return kept;
}

// ───── Lenient readers ─────

type Raw = Record<string, unknown>;

const obj = (v: unknown): Raw => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown): string[] => arr(v).map(str).filter(Boolean);

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const PRESENT = /^(present|current|now)$/i;
const emailSchema = z.email();

function isUrl(v: string): boolean {
  if (v.length > 500) return false;
  try {
    const { protocol } = new URL(v);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function hostOf(v: string): string {
  try {
    return new URL(v).hostname.replace(/^www\./, "");
  } catch {
    return v;
  }
}

const hasText = (raw: Raw) => Object.values(raw).some((v) => str(v) || strs(v).length > 0);

// ───── Cleaner ─────

type Fallback = { fullName: string; email: string };

class Cleaner {
  leftover: string[] = [];

  note(label: string, what: string, value: string) {
    this.leftover.push(`${label}: ${what} "${value}" not imported`);
  }

  /** Optional field: over `max` is dropped and noted. */
  opt(value: string, max: number, label: string, what: string): string | undefined {
    if (!value) return undefined;
    if (value.length > max) {
      this.note(label, what, value);
      return undefined;
    }
    return value;
  }

  /** Required field: empty or over `max` (noted) becomes the visible placeholder. */
  req(value: string, max: number, placeholder: string, label: string, what: string): string {
    if (!value) return placeholder;
    if (value.length > max) {
      this.note(label, what, value);
      return placeholder;
    }
    return value;
  }

  url(value: string, label: string, what = "url"): string | undefined {
    if (!value) return undefined;
    if (!isUrl(value)) {
      this.note(label, what, value);
      return undefined;
    }
    return value;
  }

  date(value: string, label: string, which: string): string | undefined {
    if (!value) return undefined;
    if (YEAR_MONTH.test(value)) return value;
    this.note(label, which, value);
    return undefined;
  }

  dates(raw: Raw, label: string) {
    const rawEnd = str(raw.end);
    const current = raw.current === true || PRESENT.test(rawEnd);
    const start = this.date(str(raw.start), label, "start date");
    // When current is true any end date is cleared (AC-6).
    let end = current ? undefined : this.date(rawEnd, label, "end date");
    if (start && end && end < start) {
      this.note(label, "end date", end);
      end = undefined;
    }
    return { start, end, current };
  }

  bullets(raw: unknown, label: string): string[] {
    const out: string[] = [];
    for (const bullet of strs(raw)) {
      let kept = bullet;
      if (bullet.length > 500) {
        kept = cutAtWord(bullet, 500);
        this.leftover.push(`${label}: ${bullet}`);
      }
      if (out.length < MAX_BULLETS) out.push(kept);
      else this.leftover.push(`${label}: ${bullet}`);
    }
    return out;
  }

  /** Keeps the first MAX_ENTRIES non empty entries; the rest go to leftover as plain lines. */
  list<T>(raw: unknown, clean: (entry: Raw) => T, overflow: (entry: Raw) => string): T[] {
    const entries = arr(raw).map(obj).filter(hasText);
    entries.slice(MAX_ENTRIES).forEach((e) => this.leftover.push(overflow(e)));
    return entries.slice(0, MAX_ENTRIES).map(clean);
  }
}

// Overflow lines skip absent parts the same way renderResumeText does.
const join = (parts: string[], sep: string) => parts.filter(Boolean).join(sep);

function rangeText(raw: Raw): string {
  const start = str(raw.start);
  const end = raw.current === true ? "Present" : str(raw.end);
  if (!start && !end) return "";
  if (start && end) return `(${start} to ${end})`;
  return start ? `(${start})` : `(to ${end})`;
}

function overflowLine(header: string[], dates: string, bullets: string[] = []): string {
  const head = join([join(header, ", "), dates], " ");
  return bullets.length ? `${head}: ${bullets.join("; ")}` : head;
}

function splitSkills(raw: unknown): string[] {
  const items = typeof raw === "string" ? [raw] : strs(raw);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of items.flatMap((i) => i.split(","))) {
    const item = piece.trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Turns a raw AI import answer into a valid section document plus the leftover
 * notice lines (AC-4, AC-5, AC-6). Throws IMPORT_UNUSABLE when the result fails the
 * schema (a bug, logged) and IMPORT_EMPTY when it has no summary and no entries.
 */
export function cleanImportedResume(raw: unknown, fallback: Fallback): { content: ResumeContent; leftover: string[] } {
  const c = new Cleaner();
  const ai = obj(raw);
  const id = () => crypto.randomUUID();

  // Contact (AC-5)
  const contactRaw = obj(ai.contact);
  let fullName = str(contactRaw.fullName);
  if (!fullName) fullName = fallback.fullName;
  else if (fullName.length > 120) {
    c.note("Contact", "full name", fullName);
    fullName = cutAtWord(fullName, 120);
  }

  let email = str(contactRaw.email);
  if (!email) email = fallback.email;
  else if (!emailSchema.safeParse(email).success) {
    c.note("Contact", "email", email);
    email = fallback.email;
  }

  const links: { id: string; label: string; url: string }[] = [];
  const seenUrls = new Set<string>();
  for (const linkRaw of arr(contactRaw.links).map(obj)) {
    const url = str(linkRaw.url);
    if (!url) continue;
    if (!isUrl(url)) {
      c.note("Contact", "link", url);
      continue;
    }
    if (seenUrls.has(url.toLowerCase())) continue;
    seenUrls.add(url.toLowerCase());
    const label = (str(linkRaw.label) || hostOf(url)).slice(0, 40).trimEnd();
    if (links.length < MAX_LINKS) links.push({ id: id(), label, url });
    else c.leftover.push(`${label}: ${url}`);
  }

  const contact = {
    fullName,
    email,
    phone: c.opt(str(contactRaw.phone), 40, "Contact", "phone"),
    location: c.opt(str(contactRaw.location), 120, "Contact", "location"),
    links,
  };

  // Summary
  let summary = str(ai.summary);
  if (summary.length > 3000) {
    c.leftover.push(`Summary: ${summary}`);
    summary = cutAtWord(summary, 3000);
  }

  const experience = c.list(
    ai.experience,
    (e) => {
      const label = str(e.company) || str(e.title) || "Experience";
      return {
        id: id(),
        title: c.req(str(e.title), 200, "[Job title]", label, "title"),
        company: c.req(str(e.company), 200, "[Company]", label, "company"),
        location: c.opt(str(e.location), 120, label, "location"),
        ...c.dates(e, label),
        bullets: c.bullets(e.bullets, label),
      };
    },
    (e) => overflowLine([str(e.company), str(e.title), str(e.location)], rangeText(e), strs(e.bullets))
  );

  const education = c.list(
    ai.education,
    (e) => {
      const label = str(e.school) || "Education";
      return {
        id: id(),
        school: c.req(str(e.school), 200, "[School]", label, "school"),
        degree: c.opt(str(e.degree), 200, label, "degree"),
        field: c.opt(str(e.field), 200, label, "field"),
        location: c.opt(str(e.location), 120, label, "location"),
        ...c.dates(e, label),
        bullets: c.bullets(e.bullets, label),
      };
    },
    (e) => overflowLine([str(e.school), str(e.degree), str(e.field)], rangeText(e), strs(e.bullets))
  );

  const projects = c.list(
    ai.projects,
    (p) => {
      const label = str(p.name) || "Project";
      return {
        id: id(),
        name: c.req(str(p.name), 200, "[Project name]", label, "name"),
        role: c.opt(str(p.role), 200, label, "role"),
        url: c.url(str(p.url), label),
        ...c.dates(p, label),
        bullets: c.bullets(p.bullets, label),
      };
    },
    (p) => overflowLine([str(p.name), str(p.role), str(p.url)], rangeText(p), strs(p.bullets))
  );

  const certifications = c.list(
    ai.certifications,
    (cert) => {
      const label = str(cert.name) || "Certification";
      return {
        id: id(),
        name: c.req(str(cert.name), 200, "[Name]", label, "name"),
        issuer: c.opt(str(cert.issuer), 200, label, "issuer"),
        date: c.date(str(cert.date), label, "date"),
        url: c.url(str(cert.url), label),
      };
    },
    (cert) => {
      const date = str(cert.date);
      const head = join([join([str(cert.name), str(cert.issuer)], ", "), date ? `(${date})` : ""], " ");
      return join([head, str(cert.url)], ", ");
    }
  );

  const languages = c.list(
    ai.languages,
    (l) => {
      const label = str(l.language) || "Language";
      return {
        id: id(),
        language: c.req(str(l.language), 60, "[Language]", label, "language"),
        proficiency: c.opt(str(l.proficiency), 60, label, "proficiency"),
      };
    },
    (l) => join([str(l.language), str(l.proficiency)], ": ")
  );

  // Skills: groups with no items are dropped before the entry cap applies.
  const skillGroups = arr(ai.skills)
    .map(obj)
    .map((g) => ({ category: str(g.category).slice(0, 60).trimEnd(), items: splitSkills(g.items) }))
    .filter((g) => g.items.length > 0);
  skillGroups
    .slice(MAX_ENTRIES)
    .forEach((g) => c.leftover.push(`${g.category || "Skills"}: ${g.items.join(", ")}`));
  const skills = skillGroups.slice(0, MAX_ENTRIES).flatMap((g) => {
    const label = g.category || "Skills";
    const fit: string[] = [];
    for (const item of g.items) {
      if (item.length > 60) c.leftover.push(`${label}: ${item}`);
      else fit.push(item);
    }
    if (fit.length > 50) c.leftover.push(`${label}: ${fit.slice(50).join(", ")}`);
    const items = fit.slice(0, 50);
    return items.length ? [{ id: id(), category: g.category, items }] : [];
  });

  for (const piece of strs(ai.unplaced)) c.leftover.push(piece.slice(0, MAX_NOTICE_ITEM));

  let content: ResumeContent;
  try {
    content = parseResumeContent({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      contact,
      summary,
      experience,
      education,
      skills,
      projects,
      certifications,
      languages,
    });
  } catch (error) {
    console.error("[Import] cleaned document failed the schema:", error instanceof Error ? error.message : error);
    throw new Error(IMPORT_UNUSABLE);
  }

  if (!hasResumeBody(content)) throw new Error(IMPORT_EMPTY);

  return { content, leftover: limitNotice(c.leftover) };
}
