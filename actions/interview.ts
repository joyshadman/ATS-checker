"use server";

import { prisma } from "@/lib/prisma/db";
import { callAI } from "@/lib/ai/client";
import {
  INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
  buildInterviewPrompt,
} from "@/lib/prompts/interview";
import type { InterviewResponse, ActionResult } from "@/types";
import { withAction, loadResumeWithAuth } from "@/lib/action-helpers";
import { revalidatePath } from "next/cache";

export async function generateInterviewQuestions(
  resumeId: string,
  jobDescription?: string
): Promise<ActionResult<InterviewResponse>> {
  return withAction(
    async (userId) => {
      const resume = await loadResumeWithAuth(userId, resumeId);

      if (!resume.originalText) throw new Error("Resume has no text content");

      const existingInterview = await prisma.interview.findFirst({
        where: { resumeId, questions: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (existingInterview?.questions) {
        revalidatePath(`/resumes/${resumeId}`);
        return { questions: JSON.parse(existingInterview.questions) };
      }

      const aiResult = await callAI<InterviewResponse>(
        INTERVIEW_QUESTIONS_SYSTEM_PROMPT,
        buildInterviewPrompt(resume.originalText, jobDescription),
        `interview:${resumeId}`
      );

      if (!aiResult.success) throw new Error(aiResult.error);

      const result = aiResult.data;

      await prisma.interview.create({
        data: {
          resumeId,
          questions: JSON.stringify(result.questions),
        },
      });

      revalidatePath(`/resumes/${resumeId}`);
      return result;
    },
    { cooldown: true, cooldownKey: `interview:${resumeId}` }
  );
}

export async function getInterviews(resumeId: string): Promise<ActionResult<unknown[]>> {
  return withAction(async () => {
    return prisma.interview.findMany({
      where: { resumeId },
      orderBy: { createdAt: "desc" },
    });
  });
}
