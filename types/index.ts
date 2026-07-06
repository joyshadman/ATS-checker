export type SectionScores = {
  format: number;
  keywords: number;
  experience: number;
  education: number;
  skills: number;
};

export type ATSAnalysisResponse = {
  atsScore: number;
  summary?: string;
  formattingScore: number;
  keywordScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  grammarScore: number;
  readabilityScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  recommendations: string[];
  weakBulletPoints: string[];
  redundantSections: string[];
  formattingProblems: string[];
  grammarSuggestions: string[];
  skillsMissing: string[];
  actionVerbs: string[];
  overallImprovements: string[];
  suggestions: string[];
  sectionScores?: SectionScores;
};

export type ResumeImprovementResponse = {
  improvedResume: string;
  summary: string;
  keyChanges: string[];
};

export type CoverLetterAnalysisResponse = {
  score: number;
  atsFriendliness: number;
  grammar: number;
  personalization: number;
  tone: number;
  professionalism: number;
  readability: number;
  suggestions: string[];
  improvedVersion: string;
};

export type CoverLetterImprovementResponse = {
  improvedCoverLetter: string;
  keyChanges: string[];
};

export type JobMatchResponse = {
  matchPercentage: number;
  missingKeywords: string[];
  matchingSkills: string[];
  missingSkills: string[];
  suggestions: string[];
  resumeChangesNeeded: string[];
};

export type InterviewQuestion = {
  type: "hr" | "technical" | "behavioral" | "project" | "experience";
  question: string;
  idealAnswer: string;
  tips: string[];
  commonMistakes: string[];
};

export type InterviewResponse = {
  questions: InterviewQuestion[];
};
