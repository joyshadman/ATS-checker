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
import type { ResumeImprovementResponse, CoverLetterImprovementResponse } from "@/types";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";

export async function improveResume(resumeId: string) {
  await requireAuth();

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId },
  });

  if (!resume) throw new Error("Resume not found");
  if (!resume.originalText) throw new Error("Resume has no text content");

  const result = await callAI<ResumeImprovementResponse>(
    RESUME_IMPROVEMENT_SYSTEM_PROMPT,
    buildResumeImprovementPrompt(resume.originalText)
  );

  await prisma.resume.update({
    where: { id: resumeId },
    data: { improvedText: result.improvedResume },
  });

  revalidatePath(`/resumes/${resumeId}`);
  return result;
}

export async function improveCoverLetter(
  coverLetterId: string,
  jobDescription?: string
) {
  await requireAuth();

  const coverLetter = await prisma.coverLetter.findFirst({
    where: { id: coverLetterId },
  });

  if (!coverLetter) throw new Error("Cover letter not found");
  if (!coverLetter.originalText) throw new Error("Cover letter has no text content");

  const result = await callAI<CoverLetterImprovementResponse>(
    COVER_LETTER_IMPROVEMENT_SYSTEM_PROMPT,
    buildCoverLetterImprovementPrompt(coverLetter.originalText, jobDescription)
  );

  await prisma.coverLetter.update({
    where: { id: coverLetterId },
    data: { improvedText: result.improvedCoverLetter },
  });

  revalidatePath(`/cover-letters/${coverLetterId}`);
  return result;
}
