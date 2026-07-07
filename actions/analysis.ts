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
import { safeRequireAuth } from "./auth";
import { revalidatePath } from "next/cache";

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
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId },
    });

    if (!resume) return { success: false, error: "Resume not found" };
    if (!resume.originalText) return { success: false, error: "Resume has no text content" };

    const aiResult = await callAI<SimplifiedAIResponse>(
      ATS_ANALYSIS_SYSTEM_PROMPT,
      buildATSAnalysisPrompt(resume.originalText, jobDescription)
    );

    const analysis = toFullResponse(aiResult);

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
      },
    });

    await prisma.resume.update({
      where: { id: resumeId },
      data: { atsScore: analysis.atsScore },
    });

    revalidatePath(`/resumes/${resumeId}`);
    return { success: true, data: analysis };
  } catch (error) {
    console.error("[analysis] analyzeResume error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Analysis failed" };
  }
}

export async function analyzeCoverLetter(
  coverLetterId: string,
  jobDescription?: string
): Promise<ActionResult<CoverLetterAnalysisResponse>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const coverLetter = await prisma.coverLetter.findFirst({
      where: { id: coverLetterId },
    });

    if (!coverLetter) return { success: false, error: "Cover letter not found" };
    if (!coverLetter.originalText) return { success: false, error: "Cover letter has no text content" };

    const analysis = await callAI<CoverLetterAnalysisResponse>(
      COVER_LETTER_ANALYSIS_SYSTEM_PROMPT,
      buildCoverLetterAnalysisPrompt(coverLetter.originalText, jobDescription)
    );

    await prisma.coverLetter.update({
      where: { id: coverLetterId },
      data: {
        score: analysis.score,
        improvedText: analysis.improvedVersion,
      },
    });

    revalidatePath(`/cover-letters/${coverLetterId}`);
    return { success: true, data: analysis };
  } catch (error) {
    console.error("[analysis] analyzeCoverLetter error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Analysis failed" };
  }
}

export async function matchResumeToJob(resumeId: string, jobDescription: string): Promise<ActionResult<JobMatchResponse>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId },
    });

    if (!resume) return { success: false, error: "Resume not found" };
    if (!resume.originalText) return { success: false, error: "Resume has no text content" };

    const match = await callAI<JobMatchResponse>(
      JOB_MATCH_SYSTEM_PROMPT,
      buildJobMatchPrompt(resume.originalText, jobDescription)
    );

    return { success: true, data: match };
  } catch (error) {
    console.error("[analysis] matchResumeToJob error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Match failed" };
  }
}
