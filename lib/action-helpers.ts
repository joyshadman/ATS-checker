import type { Prisma } from "@prisma/client";
import { safeRequireAuth } from "@/actions/auth";
import { prisma } from "@/lib/prisma/db";
import { checkCooldown } from "@/lib/utils";
import {
  hasResumeBody,
  parseResumeContent,
  RESUME_NOT_FOUND,
  RESUME_UNAUTHORIZED,
  SECTIONS_UNREADABLE,
  type ResumeContent,
} from "@/lib/resume/content";
import { renderResumeText } from "@/lib/resume/render";

export type ActionOk<T> = { success: true; data: T };
export type ActionErr = { success: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

function ok<T>(data: T): ActionOk<T> {
  return { success: true, data };
}

function err(error: string): ActionErr {
  return { success: false, error };
}

export async function withAction<T>(
  fn: (userId: string) => Promise<T>,
  options?: { cooldown?: boolean; cooldownKey?: string; cooldownMs?: number }
): Promise<ActionResult<T>> {
  const auth = await safeRequireAuth();
  if (!auth.success) return err(auth.error);

  const userId = auth.data.id;

  if (options?.cooldown) {
    const key = options.cooldownKey ?? "ai";
    if (!checkCooldown(key, userId, options.cooldownMs ?? 10000)) {
      return err("Please wait a moment before trying again");
    }
  }

  try {
    return ok(await fn(userId));
  } catch (error) {
    console.error("[Action Error]", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return err(message);
  }
}

export async function loadResumeWithAuth(userId: string, resumeId: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new Error(RESUME_NOT_FOUND);
  if (resume.userId !== userId) throw new Error(RESUME_UNAUTHORIZED);
  return resume;
}

/**
 * The text AI actions read: the rendered sections when the resume has them (null
 * if they hold no summary or entries yet), otherwise the uploaded text.
 */
export function getResumeText(resume: {
  id: string;
  content: Prisma.JsonValue | null;
  contentText: string | null;
  originalText: string | null;
}): string | null {
  if (resume.content === null) return resume.originalText;
  return hasResumeBody(readResumeContent(resume.id, resume.content)) ? resume.contentText : null;
}

/** Parses stored content; logs and throws a readable error if it is corrupt (AC-4). */
export function readResumeContent(resumeId: string, content: Prisma.JsonValue): ResumeContent {
  try {
    return parseResumeContent(content);
  } catch (error) {
    console.error(`[Resume] content of ${resumeId} could not be parsed:`, error);
    throw new Error(SECTIONS_UNREADABLE);
  }
}

/**
 * Suffix for callAI dedup keys. callAI replays a result by key for 30s and joins
 * in-flight calls, so keys must change when the content does (AC-7).
 */
export function contentVersionKey(resume: { contentUpdatedAt: Date | null }): string {
  return resume.contentUpdatedAt ? String(resume.contentUpdatedAt.getTime()) : "upload";
}

/** Rendered improve draft, or null when there is none or it cannot be parsed. */
export function renderStoredDraft(resumeId: string, improvedContent: Prisma.JsonValue | null): string | null {
  if (improvedContent === null) return null;
  try {
    return renderResumeText(parseResumeContent(improvedContent));
  } catch (error) {
    console.error(`[Resume] improvedContent of ${resumeId} could not be parsed:`, error);
    return null;
  }
}

export async function loadCoverLetterWithAuth(userId: string, coverLetterId: string) {
  const coverLetter = await prisma.coverLetter.findUnique({ where: { id: coverLetterId } });
  if (!coverLetter) throw new Error("Cover letter not found");
  if (coverLetter.userId !== userId) throw new Error("Unauthorized");
  return coverLetter;
}
