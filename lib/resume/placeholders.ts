import type { ResumeContent } from "@/lib/resume/content";

// Placeholders the AI writes for facts it does not know, e.g. [X%] (spec 0003).
// The prompt keeps them to at most 30 characters inside the brackets.

export const PLACEHOLDER_PATTERN = /\[[^\[\]\n]{1,30}\]/g;

export type TextPart = { text: string; placeholder: boolean };

/** Splits text into plain and placeholder parts, for highlighting without raw HTML. */
export function splitPlaceholders(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at), placeholder: false });
    parts.push({ text: match[0], placeholder: true });
    last = at + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), placeholder: false });
  return parts;
}

function count(text: string): number {
  return text.match(PLACEHOLDER_PATTERN)?.length ?? 0;
}

/** Placeholders left in the summary, every bullet, and every skill item. */
export function countPlaceholders(content: ResumeContent): number {
  let total = count(content.summary);
  for (const entry of [...content.experience, ...content.education, ...content.projects]) {
    for (const bullet of entry.bullets) total += count(bullet);
  }
  for (const group of content.skills) {
    for (const item of group.items) total += count(item);
  }
  return total;
}
