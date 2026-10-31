import { z } from "zod";

// Viewer templates and link styles (spec 0007). Pure, so client and server share it.
// Stored ids are plain strings in the database: always read them through the resolvers.

export const TEMPLATES = [
  { id: "classic", name: "Classic", description: "Traditional serif, centered name" },
  { id: "modern", name: "Modern", description: "Clean sans with navy headings" },
  { id: "compact", name: "Compact", description: "Tight spacing to fit more on a page" },
] as const;

export const LINK_STYLES = [
  {
    id: "url",
    name: "Visible URL",
    tradeoff: "Best for ATS and printing: the address is always readable. Takes a little more room.",
  },
  {
    id: "label",
    name: "Label only",
    tradeoff: "Cleanest look. Many ATS and printed copies lose the address.",
  },
  {
    id: "both",
    name: "Label and URL",
    tradeoff: "Clearest for people and parsers. Takes the most room on the contact line.",
  },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];
export type LinkStyle = (typeof LINK_STYLES)[number]["id"];

export const DEFAULT_TEMPLATE_ID: TemplateId = "classic";
export const DEFAULT_LINK_STYLE: LinkStyle = "url";

const templateIds = TEMPLATES.map((t) => t.id) as [TemplateId, ...TemplateId[]];
const linkStyleIds = LINK_STYLES.map((s) => s.id) as [LinkStyle, ...LinkStyle[]];

export const templateIdSchema = z.enum(templateIds, { error: "Unknown template" });
export const linkStyleSchema = z.enum(linkStyleIds, { error: "Unknown link style" });

/** The stored template id when it is in the registry, else the default (AC-13). */
export function resolveTemplateId(raw: string, resumeId: string): TemplateId {
  const parsed = templateIdSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  console.warn(`[Viewer] unknown templateId "${raw}" on resume ${resumeId}, using ${DEFAULT_TEMPLATE_ID}`);
  return DEFAULT_TEMPLATE_ID;
}

/** The stored link style when it is in the registry, else the default (AC-13). */
export function resolveLinkStyle(raw: string, resumeId: string): LinkStyle {
  const parsed = linkStyleSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  console.warn(`[Viewer] unknown linkStyle "${raw}" on resume ${resumeId}, using ${DEFAULT_LINK_STYLE}`);
  return DEFAULT_LINK_STYLE;
}
