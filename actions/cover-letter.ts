"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/db";
import { parseResumeFile } from "@/lib/parser/resume-parser";
import { safeRequireAuth } from "./auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

const createCoverLetterSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
});

type CoverLetterData = {
  id: string;
  userId: string;
  title: string | null;
  originalText: string | null;
  improvedText: string | null;
  score: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function uploadCoverLetter(formData: FormData): Promise<ActionResult<CoverLetterData>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const user = auth.data;
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    createCoverLetterSchema.parse({ title });

    if (!file || file.size === 0) {
      return { success: false, error: "File is required" };
    }

    const { text } = await parseResumeFile(file);

    const coverLetter = await prisma.coverLetter.create({
      data: {
        userId: user.id,
        title,
        originalText: text,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: coverLetter };
  } catch (error) {
    console.error("[cover-letter] uploadCoverLetter error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Validation failed" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export async function getCoverLetters(): Promise<ActionResult<CoverLetterData[]>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const coverLetters = await prisma.coverLetter.findMany({
      where: { userId: auth.data.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: coverLetters };
  } catch (error) {
    console.error("[cover-letter] getCoverLetters error:", error);
    return { success: false, error: "Failed to fetch cover letters" };
  }
}

export async function getCoverLetter(id: string): Promise<ActionResult<CoverLetterData>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const coverLetter = await prisma.coverLetter.findFirst({
      where: { id, userId: auth.data.id },
    });

    if (!coverLetter) return { success: false, error: "Cover letter not found" };
    return { success: true, data: coverLetter };
  } catch (error) {
    console.error("[cover-letter] getCoverLetter error:", error);
    return { success: false, error: "Failed to fetch cover letter" };
  }
}

export async function deleteCoverLetter(id: string): Promise<ActionResult<void>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    await prisma.coverLetter.deleteMany({
      where: { id, userId: auth.data.id },
    });

    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[cover-letter] deleteCoverLetter error:", error);
    return { success: false, error: "Failed to delete cover letter" };
  }
}
