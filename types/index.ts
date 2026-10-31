import type { AiBalanceView } from "@/lib/ai/credits-shared";

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

/** AI response for improving a sectioned resume; merged by mergeImprovement. */
export type StructuredResumeImprovementResponse = {
  summary?: string;
  entries: Array<{ id: string; bullets: string[] }>;
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

/** Raw AI answer for section writing (spec 0003); unknown until cleaned. */
export type SectionWritingAIResponse = {
  summary?: unknown;
  bullets?: unknown;
  skills?: unknown;
};

/**
 * Raw AI answer for resume import (spec 0006). Every field is unknown on purpose:
 * cleanImportedResume reads it leniently and never trusts its shape.
 */
export type ResumeImportAIResponse = {
  contact?: unknown;
  summary?: unknown;
  experience?: unknown;
  education?: unknown;
  skills?: unknown;
  projects?: unknown;
  certifications?: unknown;
  languages?: unknown;
  unplaced?: unknown;
};

export type SkillAddition = { category: string; items: string[] };

/** Cleaned section writing suggestion returned to the editor (spec 0003). */
export type SectionSuggestion =
  | { kind: "summary"; summary: string; unchanged: boolean }
  | { kind: "bullets"; entryId: string; bullets: string[]; unchanged: boolean }
  | { kind: "skills"; additions: SkillAddition[] };

/** writeResumeSection result: the suggestion plus the AI balance after its charge (spec 0004). */
export type SectionWritingResult = {
  suggestion: SectionSuggestion;
  balance: AiBalanceView;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string; retryable?: boolean };
