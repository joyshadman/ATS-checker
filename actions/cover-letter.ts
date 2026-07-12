"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/db";
import { parseResumeFile } from "@/lib/parser/resume-parser";
import { revalidatePath } from "next/cache";
import { withAction } from "@/lib/action-helpers";
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
  return withAction(async (userId) => {
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    createCoverLetterSchema.parse({ title });

    if (!file || file.size === 0) {
      throw new Error("File is required");
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Please upload a PDF, DOCX, or TXT file.");
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size must be less than 10MB");
    }

    const { text } = await parseResumeFile(file);

    const coverLetter = await prisma.coverLetter.create({
      data: {
        userId,
        title,
        originalText: text,
      },
    });

    revalidatePath("/dashboard");
    return coverLetter;
  });
}

export async function getCoverLetters(): Promise<ActionResult<CoverLetterData[]>> {
  return withAction(async (userId) => {
    return prisma.coverLetter.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function getCoverLetter(id: string): Promise<ActionResult<CoverLetterData>> {
  return withAction(async (userId) => {
    const coverLetter = await prisma.coverLetter.findFirst({
      where: { id, userId },
    });
    if (!coverLetter) throw new Error("Cover letter not found");
    return coverLetter;
  });
}

export async function deleteCoverLetter(id: string): Promise<ActionResult<void>> {
  return withAction(async (userId) => {
    await prisma.coverLetter.deleteMany({
      where: { id, userId },
    });
    revalidatePath("/dashboard");
    return undefined;
  });
}
