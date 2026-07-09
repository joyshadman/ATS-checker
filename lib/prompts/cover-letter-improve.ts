export const COVER_LETTER_ANALYSIS_SYSTEM_PROMPT = `You are an expert cover letter analyst. Return valid JSON only:
{
  "score": 0-100,
  "atsFriendliness": 0-100,
  "grammar": 0-100,
  "personalization": 0-100,
  "tone": 0-100,
  "professionalism": 0-100,
  "readability": 0-100,
  "suggestions": string[],
  "improvedVersion": string
}`;

export const COVER_LETTER_IMPROVEMENT_SYSTEM_PROMPT = `You are an expert cover letter writer. Rewrite the provided cover letter to be more effective and ATS-friendly. Return valid JSON only:
{
  "improvedCoverLetter": "complete rewritten cover letter",
  "keyChanges": string[]
}

Rules: Strong intro, relevant skills with examples, experience matching target role, professional ending with call to action, ATS-optimized plain text, personalized to role/company.`;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[content truncated...]";
}

export function buildCoverLetterAnalysisPrompt(
  coverLetterText: string,
  jobDescription?: string
): string {
  let prompt = `COVER LETTER:\n${truncate(coverLetterText, 8000)}`;
  if (jobDescription) {
    prompt += `\n\nJOB DESCRIPTION:\n${truncate(jobDescription, 4000)}`;
  }
  return prompt;
}

export function buildCoverLetterImprovementPrompt(
  coverLetterText: string,
  jobDescription?: string
): string {
  let prompt = `COVER LETTER:\n${truncate(coverLetterText, 8000)}`;
  if (jobDescription) {
    prompt += `\n\nTARGET JOB:\n${truncate(jobDescription, 4000)}`;
  }
  return prompt;
}
