"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/db";
import { parseResumeFile } from "@/lib/parser/resume-parser";
import { revalidatePath } from "next/cache";
import {
  withAction,
  loadResumeWithAuth,
  readResumeContent,
  renderStoredDraft,
} from "@/lib/action-helpers";
import {
  emptyResumeContent,
  parseResumeContent,
  RESUME_CONFLICT,
  titleSchema,
  zodIssueMessage,
  type ResumeContent,
} from "@/lib/resume/content";
import { renderResumeText } from "@/lib/resume/render";
import type { ActionResult } from "@/types";

const createResumeSchema = z.object({ title: titleSchema });

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

export async function createResume(title: string): Promise<ActionResult<{ id: string }>> {
  return withAction(async (userId) => {
    const parsed = createResumeSchema.safeParse({ title });
    if (!parsed.success) throw new Error(zodIssueMessage(parsed.error));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user) throw new Error("Unauthorized");

    const fullName = (user.name?.trim() || user.email.split("@")[0]).slice(0, 120);
    const content = emptyResumeContent({ fullName, email: user.email });

    const resume = await prisma.resume.create({
      data: {
        userId,
        title: parsed.data.title,
        content: content as Prisma.InputJsonObject,
        contentText: renderResumeText(content),
        contentUpdatedAt: new Date(),
      },
      select: { id: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/resumes");
    revalidatePath(`/resumes/${resume.id}`);
    return { id: resume.id };
  });
}

export type SaveResumeInput = {
  title?: string;
  content: unknown;
  /** The contentUpdatedAt the editor loaded or last saved, as an ISO string. */
  expectedUpdatedAt: string;
};

/**
 * Writes title and sections in one update, only if the resume still has the version
 * the editor loaded (spec 0002). Otherwise nothing is written.
 */
export async function saveResumeContent(
  id: string,
  input: SaveResumeInput
): Promise<ActionResult<{ title: string; content: ResumeContent; contentUpdatedAt: Date }>> {
  return withAction(async (userId) => {
    const resume = await loadResumeWithAuth(userId, id);
    if (resume.content === null) throw new Error("This resume has no sections to save");

    const parsed = parseResumeContent(input?.content);

    let title = resume.title;
    if (input.title !== undefined) {
      const parsedTitle = createResumeSchema.safeParse({ title: input.title });
      if (!parsedTitle.success) throw new Error(zodIssueMessage(parsedTitle.error));
      title = parsedTitle.data.title;
    }

    const expected = new Date(input.expectedUpdatedAt);
    if (Number.isNaN(expected.getTime())) throw new Error("expectedUpdatedAt: Invalid date");

    const contentUpdatedAt = new Date();
    const { count } = await prisma.resume.updateMany({
      where: { id, userId, contentUpdatedAt: expected },
      data: {
        title,
        content: parsed as Prisma.InputJsonObject,
        contentText: renderResumeText(parsed),
        contentUpdatedAt,
        improvedContent: Prisma.DbNull,
      },
    });
    if (count !== 1) throw new Error(RESUME_CONFLICT);

    revalidatePath("/dashboard");
    revalidatePath("/resumes");
    revalidatePath(`/resumes/${id}`);
    revalidatePath(`/resumes/${id}/edit`);
    return { title, content: parsed, contentUpdatedAt };
  });
}

export async function getResumeContent(id: string): Promise<
  ActionResult<{
    title: string;
    content: ResumeContent | null;
    contentUpdatedAt: Date | null;
    improvedContent: ResumeContent | null;
    hasDraft: boolean;
  }>
> {
  return withAction(async (userId) => {
    const resume = await loadResumeWithAuth(userId, id);

    const content = resume.content === null ? null : readResumeContent(id, resume.content);

    let improvedContent: ResumeContent | null = null;
    if (resume.improvedContent !== null) {
      try {
        improvedContent = parseResumeContent(resume.improvedContent);
      } catch (error) {
        console.error(`[Resume] improvedContent of ${id} could not be parsed:`, error);
      }
    }

    return {
      title: resume.title,
      content,
      contentUpdatedAt: resume.contentUpdatedAt,
      improvedContent,
      hasDraft: resume.improvedContent !== null,
    };
  });
}

export async function getResumes(): Promise<ActionResult<ResumeData[]>> {
  return withAction(async (userId) => {
    return prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        title: true,
        originalText: true,
        improvedText: true,
        atsScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
}

type ResumeDetail = ResumeData & {
  contentText: string | null;
  contentUpdatedAt: Date | null;
  improvedContentText: string | null;
  analyses: unknown[];
  interviews: unknown[];
};

export async function getResume(id: string): Promise<ActionResult<ResumeDetail>> {
  return withAction(async (userId) => {
    const resume = await prisma.resume.findFirst({
      where: { id, userId },
      omit: { content: true },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
        interviews: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!resume) throw new Error("Resume not found");

    const { improvedContent, ...rest } = resume;
    return { ...rest, improvedContentText: renderStoredDraft(id, improvedContent) };
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
