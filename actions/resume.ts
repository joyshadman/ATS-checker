"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/db";
import { parseResumeFile } from "@/lib/parser/resume-parser";
import { revalidatePath } from "next/cache";
import { withAction } from "@/lib/action-helpers";
import type { ActionResult } from "@/types";

const createResumeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
});

type ResumeData = {
  id: string;
  userId: string;
  title: string;
  originalText: string | null;
  improvedText: string | null;
  atsScore: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function uploadResume(formData: FormData): Promise<ActionResult<ResumeData>> {
  return withAction(async (userId) => {
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    createResumeSchema.parse({ title });

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

    const resume = await prisma.resume.create({
      data: {
        userId,
        title,
        originalText: text,
      },
    });

    revalidatePath("/dashboard");
    return resume;
  });
}

export async function getResumes(): Promise<ActionResult<ResumeData[]>> {
  return withAction(async (userId) => {
    return prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function getResume(id: string): Promise<ActionResult<ResumeData & { analyses: unknown[]; interviews: unknown[] }>> {
  return withAction(async (userId) => {
    const resume = await prisma.resume.findFirst({
      where: { id, userId },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
        interviews: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!resume) throw new Error("Resume not found");
    return resume;
  });
}

export async function deleteResume(id: string): Promise<ActionResult<void>> {
  return withAction(async (userId) => {
    await prisma.resume.deleteMany({
      where: { id, userId },
    });
    revalidatePath("/dashboard");
    return undefined;
  });
}

export async function updateResumeText(id: string, improvedText: string): Promise<ActionResult<unknown>> {
  return withAction(async (userId) => {
    const result = await prisma.resume.updateMany({
      where: { id, userId },
      data: { improvedText },
    });
    revalidatePath(`/resumes/${id}`);
    return result;
  });
}
