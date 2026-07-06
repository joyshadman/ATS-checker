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
}

export async function getResumes() {
  const user = await requireAuth();

  return prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getResume(id: string) {
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
}

export async function deleteResume(id: string) {
  const user = await requireAuth();

  await prisma.resume.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard");
}

export async function updateResumeText(id: string, improvedText: string) {
  const user = await requireAuth();

  const resume = await prisma.resume.updateMany({
    where: { id, userId: user.id },
    data: { improvedText },
  });

  revalidatePath(`/resumes/${id}`);
  return resume;
}
