import { compressText } from "@/lib/ai/prompts";

export const INTERVIEW_QUESTIONS_SYSTEM_PROMPT = `You are an expert interview coach. Based on the resume and job description, generate interview questions.

CRITICAL: Return ONLY raw JSON. No markdown. No code fences. No explanations. No comments. No extra text before or after the JSON.

Return exactly this structure:
{
  "questions": [
    {
      "type": "hr",
      "question": "",
      "idealAnswer": "",
      "tips": [],
      "commonMistakes": []
    }
  ]
}

The "type" field must be one of: "hr", "technical", "behavioral", "project", "experience".
Generate at least 2 questions per category (10+ total).`;

export function buildInterviewPrompt(
  resumeText: string,
  jobDescription?: string
): string {
  let prompt = `RESUME:\n${compressText(resumeText, 6000)}`;
  if (jobDescription) {
    prompt += `\n\nJOB DESCRIPTION:\n${compressText(jobDescription, 4000)}`;
  }
  return prompt;
}
