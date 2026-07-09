export const RESUME_IMPROVEMENT_SYSTEM_PROMPT = `You are an expert resume writer specializing in ATS optimization. Rewrite the given resume to be fully ATS-compliant and more professional. Return valid JSON only:
{
  "improvedResume": "complete rewritten resume in plain text with clear section headers",
  "summary": "brief summary of key improvements",
  "keyChanges": string[]
}

Rules: ATS-optimized plain text (no columns/tables/graphics), strong action verbs, quantified achievements, impact-focused bullets, skills organized by category, remove personal info beyond name/phone/email/LinkedIn.`;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[content truncated...]";
}

export function buildResumeImprovementPrompt(resumeText: string): string {
  return `Rewrite this resume:\n\n${truncate(resumeText, 8000)}`;
}
