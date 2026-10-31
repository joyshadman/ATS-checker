"use server";

import { prisma } from "@/lib/prisma/db";
import { callAI } from "@/lib/ai/client";
import {
  ATS_ANALYSIS_SYSTEM_PROMPT,
  buildATSAnalysisPrompt,
} from "@/lib/prompts/ats";
import {
  COVER_LETTER_ANALYSIS_SYSTEM_PROMPT,
  buildCoverLetterAnalysisPrompt,
} from "@/lib/prompts/cover-letter-improve";
import { JOB_MATCH_SYSTEM_PROMPT, buildJobMatchPrompt } from "@/lib/prompts/job-match";
import type {
  ATSAnalysisResponse,
  CoverLetterAnalysisResponse,
  JobMatchResponse,
  SectionScores,
  ActionResult,
} from "@/types";
import {
  withAction,
  loadResumeWithAuth,
  loadCoverLetterWithAuth,
  getResumeText,
  contentVersionKey,
} from "@/lib/action-helpers";
import { revalidatePath } from "next/cache";

function safeParseJson(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type SimplifiedAIResponse = {
  atsScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  recommendations: string[];
  sectionScores: SectionScores;
};

function toFullResponse(r: SimplifiedAIResponse): ATSAnalysisResponse {
  return {
    atsScore: r.atsScore,
    summary: r.summary,
    formattingScore: r.sectionScores.format,
    keywordScore: r.sectionScores.keywords,
    skillsScore: r.sectionScores.skills,
    experienceScore: r.sectionScores.experience,
    educationScore: r.sectionScores.education,
    grammarScore: 0,
    readabilityScore: 0,
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    missingKeywords: r.missingKeywords,
    recommendations: r.recommendations,
    weakBulletPoints: r.weaknesses,
    redundantSections: [],
    formattingProblems: [],
    grammarSuggestions: [],
    skillsMissing: [],
    actionVerbs: [],
    overallImprovements: r.recommendations,
    suggestions: r.strengths,
    sectionScores: r.sectionScores,
  };
}

export async function analyzeResume(resumeId: string, jobDescription?: string): Promise<ActionResult<ATSAnalysisResponse>> {
  return withAction(
    async (userId) => {
      const resume = await loadResumeWithAuth(userId, resumeId);
      const resumeText = getResumeText(resume);

      if (!resumeText) throw new Error("Resume has no text content");

      const existingAnalysis = await prisma.analysis.findFirst({
        where: {
          resumeId,
          jobDescription: jobDescription ?? null,
          atsScore: { not: null },
          sourceContentAt: resume.contentUpdatedAt,
        },
        orderBy: { createdAt: "desc" },
      });
      if (existingAnalysis) {
        revalidatePath(`/resumes/${resumeId}`);
        return {
          atsScore: existingAnalysis.atsScore ?? 0,
          summary: "",
          formattingScore: existingAnalysis.formattingScore ?? 0,
          keywordScore: existingAnalysis.keywordScore ?? 0,
          skillsScore: existingAnalysis.skillsScore ?? 0,
          experienceScore: existingAnalysis.experienceScore ?? 0,
          educationScore: existingAnalysis.educationScore ?? 0,
          grammarScore: existingAnalysis.grammarScore ?? 0,
          readabilityScore: existingAnalysis.readabilityScore ?? 0,
          strengths: [],
          weaknesses: [],
          missingKeywords: safeParseJson(existingAnalysis.missingKeywords),
          recommendations: safeParseJson(existingAnalysis.overallImprovements),
          weakBulletPoints: safeParseJson(existingAnalysis.weakBulletPoints),
          redundantSections: safeParseJson(existingAnalysis.redundantSections),
          formattingProblems: safeParseJson(existingAnalysis.formattingProblems),
          grammarSuggestions: safeParseJson(existingAnalysis.grammarSuggestions),
          skillsMissing: safeParseJson(existingAnalysis.skillsMissing),
          actionVerbs: safeParseJson(existingAnalysis.actionVerbs),
          overallImprovements: safeParseJson(existingAnalysis.overallImprovements),
          suggestions: safeParseJson(existingAnalysis.suggestions),
        } satisfies ATSAnalysisResponse;
      }

      const aiResult = await callAI<SimplifiedAIResponse>(
        ATS_ANALYSIS_SYSTEM_PROMPT,
        buildATSAnalysisPrompt(resumeText, jobDescription),
        `analyze:${resumeId}:${contentVersionKey(resume)}`
      );

      if (!aiResult.success) throw new Error(aiResult.error);

      const analysis = toFullResponse(aiResult.data);

      await prisma.analysis.create({
        data: {
          resumeId,
          jobDescription: jobDescription ?? null,
          atsScore: analysis.atsScore,
          keywordScore: analysis.keywordScore,
          formattingScore: analysis.formattingScore,
          skillsScore: analysis.skillsScore,
          experienceScore: analysis.experienceScore,
          educationScore: analysis.educationScore,
          grammarScore: analysis.grammarScore,
          readabilityScore: analysis.readabilityScore,
          missingKeywords: JSON.stringify(analysis.missingKeywords),
          weakBulletPoints: JSON.stringify(analysis.weakBulletPoints),
          redundantSections: JSON.stringify(analysis.redundantSections),
          formattingProblems: JSON.stringify(analysis.formattingProblems),
          grammarSuggestions: JSON.stringify(analysis.grammarSuggestions),
          skillsMissing: JSON.stringify(analysis.skillsMissing),
          actionVerbs: JSON.stringify(analysis.actionVerbs),
          overallImprovements: JSON.stringify(analysis.overallImprovements),
          suggestions: JSON.stringify(analysis.suggestions),
          sourceContentAt: resume.contentUpdatedAt,
        },
      });

      await prisma.resume.update({
        where: { id: resumeId },
        data: { atsScore: analysis.atsScore },
      });

      revalidatePath(`/resumes/${resumeId}`);
      return analysis;
    },
    { cooldown: true, cooldownKey: `analyze:${resumeId}` }
  );
}

export async function analyzeCoverLetter(
  coverLetterId: string,
  jobDescription?: string
): Promise<ActionResult<CoverLetterAnalysisResponse>> {
  return withAction(
    async (userId) => {
      const coverLetter = await loadCoverLetterWithAuth(userId, coverLetterId);

      if (!coverLetter.originalText) throw new Error("Cover letter has no text content");

      if (coverLetter.score != null && coverLetter.improvedText) {
        revalidatePath(`/cover-letters/${coverLetterId}`);
        return {
          score: coverLetter.score,
          atsFriendliness: 0,
          grammar: 0,
          personalization: 0,
          tone: 0,
          professionalism: 0,
          readability: 0,
          suggestions: [],
          improvedVersion: coverLetter.improvedText,
        } satisfies CoverLetterAnalysisResponse;
      }

      const aiResult = await callAI<CoverLetterAnalysisResponse>(
        COVER_LETTER_ANALYSIS_SYSTEM_PROMPT,
        buildCoverLetterAnalysisPrompt(coverLetter.originalText, jobDescription),
        `analyze-cover:${coverLetterId}`
      );

      if (!aiResult.success) throw new Error(aiResult.error);

      const analysis = aiResult.data;

      await prisma.coverLetter.update({
        where: { id: coverLetterId },
        data: {
          score: analysis.score,
          improvedText: analysis.improvedVersion,
        },
      });

      revalidatePath(`/cover-letters/${coverLetterId}`);
      return analysis;
    },
    { cooldown: true, cooldownKey: `analyze-cover:${coverLetterId}` }
  );
}

export async function matchResumeToJob(resumeId: string, jobDescription: string): Promise<ActionResult<JobMatchResponse>> {
  return withAction(
    async (userId) => {
      const resume = await loadResumeWithAuth(userId, resumeId);
      const resumeText = getResumeText(resume);

      if (!resumeText) throw new Error("Resume has no text content");

      const match = await callAI<JobMatchResponse>(
        JOB_MATCH_SYSTEM_PROMPT,
        buildJobMatchPrompt(resumeText, jobDescription),
        `match:${resumeId}:${contentVersionKey(resume)}`
      );

      if (!match.success) throw new Error(match.error);

      return match.data;
    },
    { cooldown: true, cooldownKey: `match:${resumeId}` }
  );
}
