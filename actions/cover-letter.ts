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
}

export async function getCoverLetters() {
  const user = await requireAuth();

  return prisma.coverLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCoverLetter(id: string) {
  const user = await requireAuth();

  const coverLetter = await prisma.coverLetter.findFirst({
    where: { id, userId: user.id },
  });

  if (!coverLetter) throw new Error("Cover letter not found");
  return coverLetter;
}

export async function deleteCoverLetter(id: string) {
  const user = await requireAuth();

  await prisma.coverLetter.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard");
}
