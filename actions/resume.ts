"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/db";
import { parseResumeFile } from "@/lib/parser/resume-parser";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";

const createResumeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
});

export async function uploadResume(formData: FormData) {
  try {
    const user = await requireAuth();

    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    createResumeSchema.parse({ title });

    if (!file || file.size === 0) {
      throw new Error("File is required");
    }

    const { text } = await parseResumeFile(file);

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        title,
        originalText: text,
      },
    });

    revalidatePath("/dashboard");
    return resume;
  } catch (error) {
    console.error("[resume] uploadResume error:", error);
    throw error;
  }
}

export async function getResumes() {
  try {
    const user = await requireAuth();

    return prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[resume] getResumes error:", error);
    throw error;
  }
}

export async function getResume(id: string) {
  try {
    const user = await requireAuth();

    const resume = await prisma.resume.findFirst({
      where: { id, userId: user.id },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
        interviews: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!resume) throw new Error("Resume not found");
    return resume;
  } catch (error) {
    console.error("[resume] getResume error:", error);
    throw error;
  }
}

export async function deleteResume(id: string) {
  try {
    const user = await requireAuth();

    await prisma.resume.deleteMany({
      where: { id, userId: user.id },
    });

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("[resume] deleteResume error:", error);
    throw error;
  }
}

export async function updateResumeText(id: string, improvedText: string) {
  try {
    const user = await requireAuth();

    const resume = await prisma.resume.updateMany({
      where: { id, userId: user.id },
      data: { improvedText },
    });

    revalidatePath(`/resumes/${id}`);
    return resume;
  } catch (error) {
    console.error("[resume] updateResumeText error:", error);
    throw error;
  }
}
