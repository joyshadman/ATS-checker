import { compressText } from "@/lib/ai/prompts";

export const JOB_MATCH_SYSTEM_PROMPT = `You are an expert job matching analyst. Compare the resume against the job description and return detailed match analysis.

CRITICAL: Return ONLY raw JSON. No markdown. No code fences. No explanations. No comments. No extra text before or after the JSON.

Return exactly this structure:
{
  "matchPercentage": 0,
  "missingKeywords": [],
  "matchingSkills": [],
  "missingSkills": [],
  "suggestions": [],
  "resumeChangesNeeded": []
}`;

export function buildJobMatchPrompt(
  resumeText: string,
  jobDescription: string
): string {
  return `RESUME:\n${compressText(resumeText, 6000)}\n\nJOB DESCRIPTION:\n${compressText(jobDescription, 4000)}`;
}
