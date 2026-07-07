"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/db";
import { parseResumeFile } from "@/lib/parser/resume-parser";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";

const createCoverLetterSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
});

export async function uploadCoverLetter(formData: FormData) {
  try {
    const user = await requireAuth();
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    createCoverLetterSchema.parse({ title });

    if (!file || file.size === 0) {
      throw new Error("File is required");
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
    return coverLetter;
  } catch (error) {
    console.error("[cover-letter] uploadCoverLetter error:", error);
    throw error;
  }
}

export async function getCoverLetters() {
  try {
    const user = await requireAuth();

    return prisma.coverLetter.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[cover-letter] getCoverLetters error:", error);
    throw error;
  }
}

export async function getCoverLetter(id: string) {
  try {
    const user = await requireAuth();

    const coverLetter = await prisma.coverLetter.findFirst({
      where: { id, userId: user.id },
    });

    if (!coverLetter) throw new Error("Cover letter not found");
    return coverLetter;
  } catch (error) {
    console.error("[cover-letter] getCoverLetter error:", error);
    throw error;
  }
}

export async function deleteCoverLetter(id: string) {
  try {
    const user = await requireAuth();

    await prisma.coverLetter.deleteMany({
      where: { id, userId: user.id },
    });

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("[cover-letter] deleteCoverLetter error:", error);
    throw error;
  }
}
