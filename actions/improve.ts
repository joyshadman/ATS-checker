"use server";

import { prisma } from "@/lib/prisma/db";
import { callAI } from "@/lib/ai/client";
import {
  RESUME_IMPROVEMENT_SYSTEM_PROMPT,
  buildResumeImprovementPrompt,
} from "@/lib/prompts/resume-improve";
import {
  COVER_LETTER_IMPROVEMENT_SYSTEM_PROMPT,
  buildCoverLetterImprovementPrompt,
} from "@/lib/prompts/cover-letter-improve";
import type { ResumeImprovementResponse, CoverLetterImprovementResponse, ActionResult } from "@/types";
import { safeRequireAuth } from "./auth";
import { revalidatePath } from "next/cache";

export async function improveResume(resumeId: string): Promise<ActionResult<ResumeImprovementResponse>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId },
    });

    if (!resume) return { success: false, error: "Resume not found" };
    if (!resume.originalText) return { success: false, error: "Resume has no text content" };

    const result = await callAI<ResumeImprovementResponse>(
      RESUME_IMPROVEMENT_SYSTEM_PROMPT,
      buildResumeImprovementPrompt(resume.originalText)
    );

    await prisma.resume.update({
      where: { id: resumeId },
      data: { improvedText: result.improvedResume },
    });

    revalidatePath(`/resumes/${resumeId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("[improve] improveResume error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Improvement failed" };
  }
}

export async function improveCoverLetter(
  coverLetterId: string,
  jobDescription?: string
): Promise<ActionResult<CoverLetterImprovementResponse>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const coverLetter = await prisma.coverLetter.findFirst({
      where: { id: coverLetterId },
    });

    if (!coverLetter) return { success: false, error: "Cover letter not found" };
    if (!coverLetter.originalText) return { success: false, error: "Cover letter has no text content" };

    const result = await callAI<CoverLetterImprovementResponse>(
      COVER_LETTER_IMPROVEMENT_SYSTEM_PROMPT,
      buildCoverLetterImprovementPrompt(coverLetter.originalText, jobDescription)
    );

    await prisma.coverLetter.update({
      where: { id: coverLetterId },
      data: { improvedText: result.improvedCoverLetter },
    });

    revalidatePath(`/cover-letters/${coverLetterId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("[improve] improveCoverLetter error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Improvement failed" };
  }
}
