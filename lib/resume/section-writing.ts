import { z } from "zod";
import type { SectionSuggestion, SkillAddition } from "@/types";

// AI section writing (spec 0003): request shapes shared by the editor and the
// server action, plus the cleaning every AI answer goes through before it reaches
// the browser. No "use server": pure functions, safe on both sides.

export const AI_STYLES = ["shorter", "impact", "technical", "grammar"] as const;
export type AiStyle = (typeof AI_STYLES)[number];

export const AI_COOLDOWN_MS = 3000;
export const UNUSABLE_ANSWER = "The AI answer could not be used. Try again.";
export const NOTHING_TO_WRITE = "Add some details first";

const MAX_SUMMARY = 3000;
const MAX_BULLETS = 12;
const MAX_BULLET_CHARS = 500;
const MAX_SKILL_CHARS = 60;
const MAX_SKILLS_PER_GROUP = 50;
const MAX_CATEGORY_CHARS = 60;

// ───── Request shapes ─────

const text = (max: number) => z.string().max(max);
const opt = (max: number) => text(max).optional();
const dates = {
  start: opt(7),
  end: opt(7),
  current: z.boolean().optional(),
};

const bulletsField = z.array(text(MAX_BULLET_CHARS)).max(MAX_BULLETS);

const summaryTarget = z.object({ kind: z.literal("summary"), text: text(MAX_SUMMARY) });

const experienceTarget = z.object({
  kind: z.literal("bullets"),
  section: z.literal("experience"),
  entryId: text(64).min(1),
  heading: z.object({ title: opt(200), company: opt(200), location: opt(120), ...dates }),
  bullets: bulletsField,
});

const educationTarget = z.object({
  kind: z.literal("bullets"),
  section: z.literal("education"),
  entryId: text(64).min(1),
  heading: z.object({ school: opt(200), degree: opt(200), field: opt(200), location: opt(120), ...dates }),
  bullets: bulletsField,
});

const projectTarget = z.object({
  kind: z.literal("bullets"),
  section: z.literal("projects"),
  entryId: text(64).min(1),
  heading: z.object({ name: opt(200), role: opt(200), ...dates }),
  bullets: bulletsField,
});

const skillsTarget = z.object({
  kind: z.literal("skills"),
  groups: z
    .array(z.object({ category: text(MAX_CATEGORY_CHARS), items: z.array(text(MAX_SKILL_CHARS)).max(MAX_SKILLS_PER_GROUP) }))
    .max(30),
});

export const sectionTargetSchema = z.union([summaryTarget, experienceTarget, educationTarget, projectTarget, skillsTarget]);
export type SectionTarget = z.infer<typeof sectionTargetSchema>;
export type BulletsTarget = Extract<SectionTarget, { kind: "bullets" }>;
export type SkillsTarget = Extract<SectionTarget, { kind: "skills" }>;

export const sectionWritingInputSchema = z
  .object({
    resumeId: text(64).min(1),
    target: sectionTargetSchema,
    context: text(20000),
    targetRole: opt(4000),
    style: z.enum(AI_STYLES).optional(),
    nonce: z.uuid(),
  })
  .superRefine((input, ctx) => {
    if (input.style && input.target.kind === "skills") {
      ctx.addIssue({ code: "custom", path: ["style"], message: "Not available for skills" });
    }
  });

export type SectionWritingInput = z.infer<typeof sectionWritingInputSchema>;

/** Identifies a target in the editor: one open panel and one request per key. */
export function targetKeyOf(target: SectionTarget): string {
  if (target.kind === "bullets") return `bullets:${target.entryId}`;
  return target.kind;
}

/** Coarse server side precondition (AC-6): the target or the context has text. */
export function hasSomethingToWrite(target: SectionTarget, context: string): boolean {
  if (context.trim().length > 0) return true;
  switch (target.kind) {
    case "summary":
      return target.text.trim().length > 0;
    case "bullets":
      return (
        target.bullets.some((b) => b.trim().length > 0) ||
        Object.values(target.heading).some((v) => typeof v === "string" && v.trim().length > 0)
      );
    case "skills":
      return target.groups.some((g) => g.items.some((i) => i.trim().length > 0));
  }
}

// ───── Cleaning (AC-14) ─────

/** Cuts at the last word boundary before `max`, never inside a [placeholder]. */
export function cutAtWord(value: string, max = MAX_BULLET_CHARS): string {
  if (value.length <= max) return value;
  let cut = value.slice(0, max);
  const space = cut.lastIndexOf(" ");
  if (space > 0) cut = cut.slice(0, space);
  const open = cut.lastIndexOf("[");
  if (open > cut.lastIndexOf("]")) cut = cut.slice(0, open);
  return cut.trimEnd();
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const norm = (value: string) => value.trim().toLowerCase();

function cleanBullets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = cutAtWord(item.trim());
    if (trimmed.length === 0) continue;
    out.push(trimmed);
    if (out.length === MAX_BULLETS) break;
  }
  return out;
}

function splitItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= MAX_SKILL_CHARS);
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * Turns a raw AI answer into a suggestion, or throws UNUSABLE_ANSWER when nothing
 * usable remains. Skills additions exclude anything already in `target.groups`.
 */
export function cleanSectionSuggestion(target: SectionTarget, raw: unknown): SectionSuggestion {
  if (!isRecord(raw)) throw new Error(UNUSABLE_ANSWER);

  if (target.kind === "summary") {
    const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
    if (summary.length === 0 || summary.length > MAX_SUMMARY) throw new Error(UNUSABLE_ANSWER);
    return { kind: "summary", summary, unchanged: summary === target.text.trim() };
  }

  if (target.kind === "bullets") {
    const bullets = cleanBullets(raw.bullets);
    if (bullets.length === 0) throw new Error(UNUSABLE_ANSWER);
    const current = target.bullets.map((b) => b.trim()).filter((b) => b.length > 0);
    return { kind: "bullets", entryId: target.entryId, bullets, unchanged: sameList(bullets, current) };
  }

  // Skills: only additions, never anything already present.
  if (!Array.isArray(raw.skills)) throw new Error(UNUSABLE_ANSWER);
  const present = new Set(target.groups.flatMap((g) => g.items.map(norm)));
  const additions: SkillAddition[] = [];
  let usable = 0;

  for (const group of raw.skills) {
    if (!isRecord(group)) continue;
    const category = typeof group.category === "string" ? group.category.trim().slice(0, MAX_CATEGORY_CHARS) : "";
    const items: string[] = [];
    for (const item of splitItems(group.items)) {
      usable += 1;
      if (present.has(norm(item))) continue;
      present.add(norm(item));
      items.push(item);
      if (items.length === MAX_SKILLS_PER_GROUP) break;
    }
    if (items.length === 0) continue;
    const existing = additions.find((a) => norm(a.category) === norm(category));
    if (existing) existing.items.push(...items.slice(0, MAX_SKILLS_PER_GROUP - existing.items.length));
    else additions.push({ category, items });
  }

  if (usable === 0) throw new Error(UNUSABLE_ANSWER);
  return { kind: "skills", additions };
}
