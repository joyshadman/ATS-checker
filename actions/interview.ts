"use server";

import { prisma } from "@/lib/prisma/db";
import { callAI } from "@/lib/ai/client";
import {
  INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
  buildInterviewPrompt,
} from "@/lib/prompts/interview";
import type { InterviewResponse, ActionResult } from "@/types";
import { safeRequireAuth } from "./auth";
import { revalidatePath } from "next/cache";

export async function generateInterviewQuestions(
  resumeId: string,
  jobDescription?: string
): Promise<ActionResult<InterviewResponse>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId },
    });

    if (!resume) return { success: false, error: "Resume not found" };
    if (!resume.originalText) return { success: false, error: "Resume has no text content" };

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
    return { success: true, data: result };
  } catch (error) {
    console.error("[interview] generateInterviewQuestions error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Generation failed" };
  }
}

export async function getInterviews(resumeId: string): Promise<ActionResult<unknown[]>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const interviews = await prisma.interview.findMany({
      where: { resumeId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: interviews };
  } catch (error) {
    console.error("[interview] getInterviews error:", error);
    return { success: false, error: "Failed to fetch interviews" };
  }
}
