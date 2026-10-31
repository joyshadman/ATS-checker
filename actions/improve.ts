"use server";

import { prisma } from "@/lib/prisma/db";
import { callAI } from "@/lib/ai/client";
import { Prisma } from "@prisma/client";
import {
  RESUME_IMPROVEMENT_SYSTEM_PROMPT,
  STRUCTURED_RESUME_IMPROVEMENT_SYSTEM_PROMPT,
  buildResumeImprovementPrompt,
  buildStructuredImprovementPrompt,
} from "@/lib/prompts/resume-improve";
import {
  COVER_LETTER_IMPROVEMENT_SYSTEM_PROMPT,
  buildCoverLetterImprovementPrompt,
} from "@/lib/prompts/cover-letter-improve";
import type {
  ResumeImprovementResponse,
  StructuredResumeImprovementResponse,
  CoverLetterImprovementResponse,
  ActionResult,
} from "@/types";
import {
  withAction,
  loadResumeWithAuth,
  loadCoverLetterWithAuth,
  readResumeContent,
  renderStoredDraft,
  contentVersionKey,
} from "@/lib/action-helpers";
import {
  hasResumeBody,
  mergeImprovement,
  parseResumeContent,
  selectImproveEntries,
} from "@/lib/resume/content";
import { renderResumeText } from "@/lib/resume/render";
import { revalidatePath } from "next/cache";

export async function improveResume(resumeId: string): Promise<ActionResult<ResumeImprovementResponse>> {
  return withAction(
    async (userId) => {
      const resume = await loadResumeWithAuth(userId, resumeId);

      // Sectioned resume: rewrite summary and bullets into a draft the user accepts or discards.
      if (resume.content !== null) {
        const content = readResumeContent(resumeId, resume.content);

        const storedDraft = renderStoredDraft(resumeId, resume.improvedContent);
        if (storedDraft) {
          revalidatePath(`/resumes/${resumeId}`);
          return { improvedResume: storedDraft, summary: "", keyChanges: [] };
        }

        if (!hasResumeBody(content)) throw new Error("Resume has no text content");

        const aiResult = await callAI<StructuredResumeImprovementResponse>(
          STRUCTURED_RESUME_IMPROVEMENT_SYSTEM_PROMPT,
          buildStructuredImprovementPrompt(content.summary, selectImproveEntries(content)),
          `improve:${resumeId}:${contentVersionKey(resume)}`
        );

        if (!aiResult.success) throw new Error(aiResult.error);

        const draft = mergeImprovement(content, aiResult.data);

        const { count } = await prisma.resume.updateMany({
          where: { id: resumeId, userId, contentUpdatedAt: resume.contentUpdatedAt },
          data: { improvedContent: draft as Prisma.InputJsonObject },
        });
        if (count !== 1) throw new Error("Resume changed, try again");

        revalidatePath(`/resumes/${resumeId}`);
        return {
          improvedResume: renderResumeText(draft),
          summary: "",
          keyChanges: Array.isArray(aiResult.data.keyChanges)
            ? aiResult.data.keyChanges.filter((c): c is string => typeof c === "string")
            : [],
        };
      }

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

export async function acceptImprovedContent(
  resumeId: string
): Promise<ActionResult<{ contentUpdatedAt: Date }>> {
  return withAction(async (userId) => {
    const resume = await loadResumeWithAuth(userId, resumeId);
    if (resume.improvedContent === null) throw new Error("No improvement draft to apply");

    const draft = parseResumeContent(resume.improvedContent);
    const contentUpdatedAt = new Date();

    const { count } = await prisma.resume.updateMany({
      where: { id: resumeId, userId, contentUpdatedAt: resume.contentUpdatedAt },
      data: {
        content: draft as Prisma.InputJsonObject,
        contentText: renderResumeText(draft),
        contentUpdatedAt,
        improvedContent: Prisma.DbNull,
      },
    });
    if (count !== 1) throw new Error("Resume changed, try again");

    revalidatePath("/resumes");
    revalidatePath(`/resumes/${resumeId}`);
    return { contentUpdatedAt };
  });
}

export async function discardImprovedContent(resumeId: string): Promise<ActionResult<void>> {
  return withAction(async (userId) => {
    const resume = await loadResumeWithAuth(userId, resumeId);
    if (resume.improvedContent === null) throw new Error("No improvement draft to apply");

    await prisma.resume.update({
      where: { id: resumeId },
      data: { improvedContent: Prisma.DbNull },
    });

    revalidatePath("/resumes");
    revalidatePath(`/resumes/${resumeId}`);
    return undefined;
  });
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
