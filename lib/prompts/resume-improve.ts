import { compressText } from "@/lib/ai/prompts";

export const RESUME_IMPROVEMENT_SYSTEM_PROMPT = `You are an expert resume writer specializing in ATS optimization. Rewrite the given resume to be fully ATS-compliant and more professional.

CRITICAL: Return ONLY raw JSON. No markdown. No code fences. No explanations. No comments. No extra text before or after the JSON.

Return exactly this structure:
{
  "improvedResume": "complete rewritten resume in plain text with clear section headers",
  "summary": "brief summary of key improvements",
  "keyChanges": []
}

Rules: ATS-optimized plain text (no columns/tables/graphics), strong action verbs, quantified achievements, impact-focused bullets, skills organized by category, remove personal info beyond name/phone/email/LinkedIn.`;

export function buildResumeImprovementPrompt(resumeText: string): string {
  return `Rewrite this resume:\n\n${compressText(resumeText, 8000)}`;
}

export const STRUCTURED_RESUME_IMPROVEMENT_SYSTEM_PROMPT = `You are an expert resume writer specializing in ATS optimization. Rewrite the given resume summary and bullet points to be stronger and more ATS-friendly.

CRITICAL: Return ONLY raw JSON. No markdown. No code fences. No explanations. No comments. No extra text before or after the JSON.

Return exactly this structure:
{
  "summary": "rewritten professional summary (omit if none was given)",
  "entries": [{ "id": "same id as given", "bullets": ["rewritten bullet"] }],
  "keyChanges": []
}

Rules: keep every id exactly as given and return each entry once; 1 to 12 bullets per entry, each under 500 characters; strong action verbs, quantified achievements, impact-focused; never invent employers, titles, dates, or numbers that are not implied by the input.`;

export function buildStructuredImprovementPrompt(
  summary: string,
  entries: Array<{ id: string; bullets: string[] }>
): string {
  return `Rewrite this resume content:\n\n${JSON.stringify({ summary, entries })}`;
}
