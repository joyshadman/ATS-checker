export const INTERVIEW_QUESTIONS_SYSTEM_PROMPT = `You are an expert interview coach. Based on the provided resume and job description, generate interview questions.

Return JSON with exactly this structure:
{
  "questions": [
    {
      "type": "hr" | "technical" | "behavioral" | "project" | "experience",
      "question": string,
      "idealAnswer": string,
      "tips": string[],
      "commonMistakes": string[]
    }
  ]
}

Generate at least 2 questions per category (10+ total).`;

export function buildInterviewPrompt(
  resumeText: string,
  jobDescription?: string
): string {
  let prompt = `Generate interview questions based on this resume:\n\n${resumeText}`;
  if (jobDescription) {
    prompt += `\n\nTarget Job Description:\n${jobDescription}`;
  }
  return prompt;
}
