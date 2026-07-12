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
import { withAction, loadResumeWithAuth, loadCoverLetterWithAuth } from "@/lib/action-helpers";
import { revalidatePath } from "next/cache";

export async function improveResume(resumeId: string): Promise<ActionResult<ResumeImprovementResponse>> {
  return withAction(
    async (userId) => {
      const resume = await loadResumeWithAuth(userId, resumeId);

      if (!resume.originalText) throw new Error("Resume has no text content");

      if (resume.improvedText) {
        revalidatePath(`/resumes/${resumeId}`);
        return { improvedResume: resume.improvedText, summary: "", keyChanges: [] };
      }

      const aiResult = await callAI<ResumeImprovementResponse>(
        RESUME_IMPROVEMENT_SYSTEM_PROMPT,
        buildResumeImprovementPrompt(resume.originalText),
        `improve:${resumeId}`
      );

      if (!aiResult.success) throw new Error(aiResult.error);

      const result = aiResult.data;

      await prisma.resume.update({
        where: { id: resumeId },
        data: { improvedText: result.improvedResume },
      });

      revalidatePath(`/resumes/${resumeId}`);
      return result;
    },
    { cooldown: true, cooldownKey: `improve:${resumeId}` }
  );
}

export async function improveCoverLetter(
  coverLetterId: string,
  jobDescription?: string
): Promise<ActionResult<CoverLetterImprovementResponse>> {
  return withAction(
    async (userId) => {
      const coverLetter = await loadCoverLetterWithAuth(userId, coverLetterId);

      if (!coverLetter.originalText) throw new Error("Cover letter has no text content");

      if (coverLetter.improvedText) {
        revalidatePath(`/cover-letters/${coverLetterId}`);
        return { improvedCoverLetter: coverLetter.improvedText, keyChanges: [] };
      }

      const aiResult = await callAI<CoverLetterImprovementResponse>(
        COVER_LETTER_IMPROVEMENT_SYSTEM_PROMPT,
        buildCoverLetterImprovementPrompt(coverLetter.originalText, jobDescription),
        `improve-cover:${coverLetterId}`
      );

      if (!aiResult.success) throw new Error(aiResult.error);

      const result = aiResult.data;

      await prisma.coverLetter.update({
        where: { id: coverLetterId },
        data: { improvedText: result.improvedCoverLetter },
      });

      revalidatePath(`/cover-letters/${coverLetterId}`);
      return result;
    },
    { cooldown: true, cooldownKey: `improve-cover:${coverLetterId}` }
  );
}
