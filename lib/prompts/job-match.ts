export const JOB_MATCH_SYSTEM_PROMPT = `You are an expert job matching analyst. Compare the resume against the job description and return detailed match analysis. Return valid JSON only:
{
  "matchPercentage": 0-100,
  "missingKeywords": string[],
  "matchingSkills": string[],
  "missingSkills": string[],
  "suggestions": string[],
  "resumeChangesNeeded": string[]
}`;

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[content truncated...]";
}

export function buildJobMatchPrompt(
  resumeText: string,
  jobDescription: string
): string {
  return `RESUME:\n${truncate(resumeText, 8000)}\n\nJOB DESCRIPTION:\n${truncate(jobDescription, 4000)}`;
}
