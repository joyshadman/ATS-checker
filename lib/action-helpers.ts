import { safeRequireAuth } from "@/actions/auth";
import { prisma } from "@/lib/prisma/db";
import { checkCooldown } from "@/lib/utils";

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
  if (!resume) throw new Error("Resume not found");
  if (resume.userId !== userId) throw new Error("Unauthorized");
  return resume;
}

export async function loadCoverLetterWithAuth(userId: string, coverLetterId: string) {
  const coverLetter = await prisma.coverLetter.findUnique({ where: { id: coverLetterId } });
  if (!coverLetter) throw new Error("Cover letter not found");
  if (coverLetter.userId !== userId) throw new Error("Unauthorized");
  return coverLetter;
}
