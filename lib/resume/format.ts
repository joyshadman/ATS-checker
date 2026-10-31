import type { LinkStyle } from "@/lib/resume/templates";

// Display formatting for the resume sheet (spec 0007, AC-4 and AC-6). Never uses the
// browser locale, so every browser shows the same text.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Dated = { start?: string; end?: string | null; current: boolean };

/** "2021-03" → "Mar 2021". Anything not shaped like YYYY-MM is shown as is. */
export function formatMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${month} ${match[1]}` : value;
}

/** "Mar 2021 – Present", "Jan 2018 – Feb 2021", one date alone, or "" (AC-6). */
export function formatRange({ start, end, current }: Dated): string {
  const from = start ? formatMonth(start) : undefined;
  const to = current ? "Present" : end ? formatMonth(end) : undefined;
  if (from && to) return `${from} – ${to}`;
  return from ?? to ?? "";
}

/** Drops http:// or https:// and one trailing slash: "linkedin.com/in/jane". */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * "<full name> Resume", the PDF's suggested file name and title (spec 0008, AC-6).
 * Drops characters file systems reject, collapses spaces, caps at 100 characters.
 */
export function pdfFileTitle(fullName: string): string {
  const name = fullName.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  return (name ? `${name} Resume` : "Resume").slice(0, 100).trim();
}

/** The visible text of a link in the chosen style (AC-4). */
export function linkText(link: { label: string; url: string }, style: LinkStyle): string {
  switch (style) {
    case "label":
      return link.label;
    case "both":
      return `${link.label}: ${displayUrl(link.url)}`;
    default:
      return displayUrl(link.url);
  }
}
