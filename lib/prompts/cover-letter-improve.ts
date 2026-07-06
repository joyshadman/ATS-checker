export const COVER_LETTER_ANALYSIS_SYSTEM_PROMPT = `You are an expert cover letter analyst. Analyze the provided cover letter and return a JSON response.

If a job description is provided, also evaluate how well the cover letter matches the job requirements.

Return JSON with exactly this structure:
{
  "score": number (0-100),
  "atsFriendliness": number (0-100),
  "grammar": number (0-100),
  "personalization": number (0-100),
  "tone": number (0-100),
  "professionalism": number (0-100),
  "readability": number (0-100),
  "suggestions": string[],
  "improvedVersion": string
}`;

export const COVER_LETTER_IMPROVEMENT_SYSTEM_PROMPT = `You are an expert cover letter writer. Rewrite the provided cover letter to be more effective and ATS-friendly.

Return JSON with exactly this structure:
{
  "improvedCoverLetter": string (the complete rewritten cover letter),
  "keyChanges": string[]
}

Requirements for the improved cover letter:
- Strong introduction that grabs attention
- Relevant skills highlighted with specific examples
- Experience matching the target role
- Professional ending with call to action
- ATS-optimized plain text format
- Personalized to the specific role/company`;

export function buildCoverLetterAnalysisPrompt(
  coverLetterText: string,
  jobDescription?: string
): string {
  let prompt = `Analyze this cover letter:\n\n${coverLetterText}`;
  if (jobDescription) {
    prompt += `\n\nJob Description:\n${jobDescription}`;
  }
  return prompt;
}

export function buildCoverLetterImprovementPrompt(
  coverLetterText: string,
  jobDescription?: string
): string {
  let prompt = `Rewrite this cover letter to be more effective:\n\n${coverLetterText}`;
  if (jobDescription) {
    prompt += `\n\nTarget Job Description:\n${jobDescription}`;
  }
  return prompt;
}
