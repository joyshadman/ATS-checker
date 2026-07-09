export const ATS_ANALYSIS_SYSTEM_PROMPT = `You are an expert ATS resume analyzer. Return valid JSON only:
{
  "atsScore": number (0-100),
  "summary": "1-2 sentence summary",
  "strengths": string[],
  "weaknesses": string[],
  "missingKeywords": string[],
  "recommendations": string[],
  "sectionScores": { "format": 0-100, "keywords": 0-100, "experience": 0-100, "education": 0-100, "skills": 0-100 }
}`;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[content truncated...]";
}

export function buildATSAnalysisPrompt(resumeText: string, jobDescription?: string): string {
  let prompt = `RESUME:\n${truncate(resumeText, 8000)}`;
  if (jobDescription) {
    prompt += `\n\nJOB DESCRIPTION:\n${truncate(jobDescription, 4000)}`;
  }
  return prompt;
}
