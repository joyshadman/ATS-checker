export const INTERVIEW_QUESTIONS_SYSTEM_PROMPT = `You are an expert interview coach. Based on the resume and job description, generate interview questions. Return valid JSON only:
{
  "questions": [{
    "type": "hr" | "technical" | "behavioral" | "project" | "experience",
    "question": string,
    "idealAnswer": string,
    "tips": string[],
    "commonMistakes": string[]
  }]
}

Generate at least 2 questions per category (10+ total).`;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[content truncated...]";
}

export function buildInterviewPrompt(
  resumeText: string,
  jobDescription?: string
): string {
  let prompt = `RESUME:\n${truncate(resumeText, 8000)}`;
  if (jobDescription) {
    prompt += `\n\nJOB DESCRIPTION:\n${truncate(jobDescription, 4000)}`;
  }
  return prompt;
}
