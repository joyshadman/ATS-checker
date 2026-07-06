export const JOB_MATCH_SYSTEM_PROMPT = `You are an expert job matching analyst. Compare the provided resume against the job description and return a detailed match analysis.

Return JSON with exactly this structure:
{
  "matchPercentage": number (0-100),
  "missingKeywords": string[],
  "matchingSkills": string[],
  "missingSkills": string[],
  "suggestions": string[],
  "resumeChangesNeeded": string[]
}`;

export function buildJobMatchPrompt(
  resumeText: string,
  jobDescription: string
): string {
  return `Compare this resume against the job description and analyze the match.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;
}
