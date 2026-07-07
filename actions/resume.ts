"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma/db";
import { parseResumeFile } from "@/lib/parser/resume-parser";
import { safeRequireAuth } from "./auth";
import { revalidatePath } from "next/cache";
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
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const user = auth.data;
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    createResumeSchema.parse({ title });

    if (!file || file.size === 0) {
      return { success: false, error: "File is required" };
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
    return { success: true, data: resume };
  } catch (error) {
    console.error("[resume] uploadResume error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Validation failed" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export async function getResumes(): Promise<ActionResult<ResumeData[]>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const resumes = await prisma.resume.findMany({
      where: { userId: auth.data.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: resumes };
  } catch (error) {
    console.error("[resume] getResumes error:", error);
    return { success: false, error: "Failed to fetch resumes" };
  }
}

export async function getResume(id: string): Promise<ActionResult<ResumeData & { analyses: unknown[]; interviews: unknown[] }>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const resume = await prisma.resume.findFirst({
      where: { id, userId: auth.data.id },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
        interviews: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!resume) return { success: false, error: "Resume not found" };
    return { success: true, data: resume };
  } catch (error) {
    console.error("[resume] getResume error:", error);
    return { success: false, error: "Failed to fetch resume" };
  }
}

export async function deleteResume(id: string): Promise<ActionResult<void>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    await prisma.resume.deleteMany({
      where: { id, userId: auth.data.id },
    });

    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[resume] deleteResume error:", error);
    return { success: false, error: "Failed to delete resume" };
  }
}

export async function updateResumeText(id: string, improvedText: string): Promise<ActionResult<unknown>> {
  try {
    const auth = await safeRequireAuth();
    if (!auth.success) return auth;

    const resume = await prisma.resume.updateMany({
      where: { id, userId: auth.data.id },
      data: { improvedText },
    });

    revalidatePath(`/resumes/${id}`);
    return { success: true, data: resume };
  } catch (error) {
    console.error("[resume] updateResumeText error:", error);
    return { success: false, error: "Failed to update resume" };
  }
}
