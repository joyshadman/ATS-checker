"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/db";
import { callAI } from "@/lib/ai/client";
import { refundAiUse, reserveAiUse } from "@/lib/ai/credits";
import type { AiBalanceView } from "@/lib/ai/credits-shared";
import { withAction, loadResumeWithAuth } from "@/lib/action-helpers";
import { zodIssueMessage } from "@/lib/resume/content";
import { renderResumeText } from "@/lib/resume/render";
import {
  cleanImportedResume,
  IMPORT_AI_OPTIONS,
  IMPORT_COOLDOWN_MS,
  IMPORT_HAS_SECTIONS,
  IMPORT_JUST_FINISHED,
  IMPORT_MAX_CHARS,
  IMPORT_NO_TEXT,
  IMPORT_RECENT_MS,
  IMPORT_SAVE_FAILED,
  IMPORT_UNUSABLE,
  IMPORT_EMPTY,
  importCopyTitle,
  importNoticeSchema,
} from "@/lib/resume/import";
import { buildResumeImportPrompt, RESUME_IMPORT_SYSTEM_PROMPT } from "@/lib/prompts/resume-import";
import type { ActionResult, ResumeImportAIResponse } from "@/types";

const importInputSchema = z.object({
  resumeId: z.string().min(1, "Required"),
  nonce: z.string().min(1, "Required").max(64),
});

function logOutcome(outcome: string, startedAt: number, inputLength: number) {
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[Import] ${outcome} duration=${seconds}s input=${inputLength}`);
}

function outcomeOf(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("AI request timed out")) return "timeout";
  if (message === "The AI answer was too long. Try again.") return "too_long";
  if (message === IMPORT_EMPTY) return "empty";
  if (message === IMPORT_UNUSABLE) return "invalid";
  return "failed";
}

/**
 * Splits an uploaded resume into sections with one AI call and saves them as a new
 * built copy linked to the upload (spec 0006). The upload row is never written. One AI
 * use is reserved after every free check and refunded if anything fails before the
 * copy exists; once it exists the charge is kept.
 */
export async function importResume(input: {
  resumeId: string;
  nonce: string;
}): Promise<ActionResult<{ id: string; balance: AiBalanceView }>> {
  return withAction(
    async (userId) => {
      const parsed = importInputSchema.safeParse(input);
      if (!parsed.success) throw new Error(zodIssueMessage(parsed.error));
      const { resumeId, nonce } = parsed.data;

      const upload = await loadResumeWithAuth(userId, resumeId);
      if (upload.content !== null) throw new Error(IMPORT_HAS_SECTIONS);
      const text = upload.originalText?.trim() ?? "";
      if (!text) throw new Error(IMPORT_NO_TEXT);

      // The cooldown lives in one server's memory; this check stops two tabs (or a
      // press after a client timeout) from paying twice.
      const recent = await prisma.resume.findFirst({
        where: { importedFromId: resumeId, userId, createdAt: { gte: new Date(Date.now() - IMPORT_RECENT_MS) } },
        select: { id: true },
      });
      if (recent) throw new Error(IMPORT_JUST_FINISHED);

      const { ledgerId, balance } = await reserveAiUse(userId, "IMPORT", resumeId);

      const truncated = text.length > IMPORT_MAX_CHARS;
      const sent = text.slice(0, IMPORT_MAX_CHARS);
      const startedAt = Date.now();
      let id: string;

      try {
        const aiResult = await callAI<ResumeImportAIResponse>(
          RESUME_IMPORT_SYSTEM_PROMPT,
          buildResumeImportPrompt({ text: sent, nonce }),
          `import:${userId}:${resumeId}:${nonce}`,
          IMPORT_AI_OPTIONS
        );
        if (!aiResult.success) throw new Error(aiResult.error);

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        if (!user) throw new Error("Unauthorized");

        const fullName = (user.name?.trim() || user.email.split("@")[0]).slice(0, 120);
        const { content, leftover } = cleanImportedResume(aiResult.data, { fullName, email: user.email });
        const notice = importNoticeSchema.parse({ schemaVersion: 1, leftover, truncated });

        try {
          const copy = await prisma.resume.create({
            data: {
              userId,
              title: importCopyTitle(upload.title),
              content: content as Prisma.InputJsonObject,
              contentText: renderResumeText(content),
              contentUpdatedAt: new Date(),
              importedFromId: resumeId,
              importNotice: notice as Prisma.InputJsonObject,
            },
            select: { id: true },
          });
          id = copy.id;
        } catch (error) {
          console.error(`[Import] could not save the copy of ${resumeId}:`, error);
          throw new Error(IMPORT_SAVE_FAILED);
        }
      } catch (error) {
        logOutcome(outcomeOf(error), startedAt, sent.length);
        await refundAiUse(userId, ledgerId);
        throw error;
      }

      logOutcome("ok", startedAt, sent.length);

      // The copy exists, so nothing below may refund or fail the action.
      for (const path of ["/dashboard", "/resumes", `/resumes/${resumeId}`, `/resumes/${id}`]) {
        try {
          revalidatePath(path);
        } catch (error) {
          console.error(`[Import] revalidatePath(${path}) failed:`, error);
        }
      }

      return { id, balance };
    },
    { cooldown: true, cooldownKey: "ai-import", cooldownMs: IMPORT_COOLDOWN_MS }
  );
}

/** Clears an imported copy's notice (AC-8). Never touches content or contentUpdatedAt. */
export async function dismissImportNotice(resumeId: string): Promise<ActionResult<void>> {
  return withAction(async (userId) => {
    await loadResumeWithAuth(userId, resumeId);
    await prisma.resume.updateMany({
      where: { id: resumeId, userId },
      data: { importNotice: Prisma.DbNull },
    });
    revalidatePath(`/resumes/${resumeId}/edit`);
    return undefined;
  });
}
