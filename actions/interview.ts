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
  try {
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
  } catch (error) {
    console.error("[interview] generateInterviewQuestions error:", error);
    throw error;
  }
}

export async function getInterviews(resumeId: string) {
  try {
    await requireAuth();

    return prisma.interview.findMany({
      where: { resumeId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[interview] getInterviews error:", error);
    throw error;
  }
}
