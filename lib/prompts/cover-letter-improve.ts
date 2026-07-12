import { compressText } from "@/lib/ai/prompts";

export const COVER_LETTER_ANALYSIS_SYSTEM_PROMPT = `You are an expert cover letter analyst.

CRITICAL: Return ONLY raw JSON. No markdown. No code fences. No explanations. No comments. No extra text before or after the JSON.

Return exactly this structure:
{
  "score": 0,
  "atsFriendliness": 0,
  "grammar": 0,
  "personalization": 0,
  "tone": 0,
  "professionalism": 0,
  "readability": 0,
  "suggestions": [],
  "improvedVersion": ""
}`;

export const COVER_LETTER_IMPROVEMENT_SYSTEM_PROMPT = `You are an expert cover letter writer. Rewrite the provided cover letter to be more effective and ATS-friendly.

CRITICAL: Return ONLY raw JSON. No markdown. No code fences. No explanations. No comments. No extra text before or after the JSON.

Return exactly this structure:
{
  "improvedCoverLetter": "complete rewritten cover letter",
  "keyChanges": []
}

Rules: Strong intro, relevant skills with examples, experience matching target role, professional ending with call to action, ATS-optimized plain text, personalized to role/company.`;

export function buildCoverLetterAnalysisPrompt(
  coverLetterText: string,
  jobDescription?: string
): string {
  let prompt = `COVER LETTER:\n${compressText(coverLetterText, 6000)}`;
  if (jobDescription) {
    prompt += `\n\nJOB DESCRIPTION:\n${compressText(jobDescription, 4000)}`;
  }
  return prompt;
}

export function buildCoverLetterImprovementPrompt(
  coverLetterText: string,
  jobDescription?: string
): string {
  let prompt = `COVER LETTER:\n${compressText(coverLetterText, 6000)}`;
  if (jobDescription) {
    prompt += `\n\nTARGET JOB:\n${compressText(jobDescription, 4000)}`;
  }
  return prompt;
}
