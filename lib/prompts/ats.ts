import { compressText } from "@/lib/ai/prompts";

export const ATS_ANALYSIS_SYSTEM_PROMPT = `You are an expert ATS resume analyzer.

CRITICAL: Return ONLY raw JSON. No markdown. No code fences. No explanations. No comments. No extra text before or after the JSON.

Return exactly this structure:
{
  "atsScore": 0,
  "summary": "",
  "strengths": [],
  "weaknesses": [],
  "missingKeywords": [],
  "recommendations": [],
  "sectionScores": { "format": 0, "keywords": 0, "experience": 0, "education": 0, "skills": 0 }
}`;

export function buildATSAnalysisPrompt(resumeText: string, jobDescription?: string): string {
  let prompt = `RESUME:\n${compressText(resumeText, 6000)}`;
  if (jobDescription) {
    prompt += `\n\nJOB DESCRIPTION:\n${compressText(jobDescription, 4000)}`;
  }
  return prompt;
}
