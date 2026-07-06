"use server";

import { prisma } from "@/lib/prisma/db";
import { callAI } from "@/lib/ai/client";
import {
  INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
  buildInterviewPrompt,
} from "@/lib/prompts/interview";
import type { InterviewResponse } from "@/types";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";

export async function generateInterviewQuestions(
  resumeId: string,
  jobDescription?: string
) {
  await requireAuth();

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId },
  });

  if (!resume) throw new Error("Resume not found");
  if (!resume.originalText) throw new Error("Resume has no text content");

  const result = await callAI<InterviewResponse>(
    INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
    buildInterviewPrompt(resume.originalText, jobDescription)
  );

  await prisma.interview.create({
    data: {
      resumeId,
      questions: JSON.stringify(result.questions),
    },
  });

  revalidatePath(`/resumes/${resumeId}`);
  return result;
}

export async function getInterviews(resumeId: string) {
  await requireAuth();

  return prisma.interview.findMany({
    where: { resumeId },
    orderBy: { createdAt: "desc" },
  });
}
