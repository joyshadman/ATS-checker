export const ATS_ANALYSIS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume analyzer.

Return JSON with this structure:
{
  "atsScore": number 0-100,
  "summary": "1-2 sentence summary",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missingKeywords": ["..."],
  "recommendations": ["..."],
  "sectionScores": {
    "format": number 0-100,
    "keywords": number 0-100,
    "experience": number 0-100,
    "education": number 0-100,
    "skills": number 0-100
  }
}`;

export function buildATSAnalysisPrompt(resumeText: string, jobDescription?: string): string {
  let prompt = `Resume:\n${resumeText}`;
  if (jobDescription) {
    prompt += `\n\nJob Description:\n${jobDescription}`;
  }
  return prompt;
}
