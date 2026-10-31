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
} from "@/lib/action-helpers";
import {
  emptyResumeContent,
  parseResumeContent,
  RESUME_CONFLICT,
  RESUME_NOT_FOUND,
  titleSchema,
  zodIssueMessage,
  type ResumeContent,
} from "@/lib/resume/content";
import { renderResumeText } from "@/lib/resume/render";
import { readImportNotice, type ImportNotice } from "@/lib/resume/import";
import {
  linkStyleSchema,
  resolveLinkStyle,
  resolveTemplateId,
  templateIdSchema,
  type LinkStyle,
  type TemplateId,
} from "@/lib/resume/templates";
import type { ActionResult } from "@/types";

type ResumeLink = { id: string; title: string };

/** The newest imported copy of an upload (spec 0006), owner only. */
function latestImportOf(userId: string, uploadId: string): Promise<ResumeLink | null> {
  return prisma.resume.findFirst({
    where: { importedFromId: uploadId, userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
}

/** The upload a copy was imported from, owner only; null when it was deleted. */
function importedFromOf(userId: string, importedFromId: string | null): Promise<ResumeLink | null> {
  if (!importedFromId) return Promise.resolve(null);
  return prisma.resume.findFirst({
    where: { id: importedFromId, userId },
    select: { id: true, title: true },
  });
}

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
    importNotice: ImportNotice | null;
    importedFrom: ResumeLink | null;
    latestImport: ResumeLink | null;
    hasUploadText: boolean;
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

    const [importedFrom, latestImport] = await Promise.all([
      importedFromOf(userId, resume.importedFromId),
      content === null ? latestImportOf(userId, id) : Promise.resolve(null),
    ]);

    return {
      title: resume.title,
      content,
      contentUpdatedAt: resume.contentUpdatedAt,
      improvedContent,
      hasDraft: resume.improvedContent !== null,
      importNotice: readImportNotice(id, resume.importNotice),
      importedFrom,
      latestImport,
      hasUploadText: !!resume.originalText?.trim(),
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
  content: ResumeContent | null;
  contentUnreadable: boolean;
  improvedContent: ResumeContent | null;
  improvedContentText: string | null;
  templateId: TemplateId;
  linkStyle: LinkStyle;
  importedFrom: ResumeLink | null;
  latestImport: ResumeLink | null;
  analyses: unknown[];
  interviews: unknown[];
};

/** Parsed stored sections, or null (logged) when they cannot be read. */
function parseStored(resumeId: string, column: string, raw: Prisma.JsonValue): ResumeContent | null {
  try {
    return parseResumeContent(raw);
  } catch (error) {
    console.error(`[Resume] ${column} of ${resumeId} could not be parsed:`, error);
    return null;
  }
}

export async function getResume(id: string): Promise<ActionResult<ResumeDetail>> {
  return withAction(async (userId) => {
    const resume = await prisma.resume.findFirst({
      where: { id, userId },
      omit: { importNotice: true },
      include: {
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
        interviews: { orderBy: { createdAt: "desc" }, take: 1 },
        importedFrom: { select: { id: true, title: true, userId: true } },
      },
    });

    if (!resume) throw new Error("Resume not found");

    const latestImport = resume.contentUpdatedAt === null ? await latestImportOf(userId, id) : null;
    const { content: rawContent, improvedContent: rawImproved, importedFrom, templateId, linkStyle, ...rest } = resume;
    const content = rawContent === null ? null : parseStored(id, "content", rawContent);
    const improvedContent = rawImproved === null ? null : parseStored(id, "improvedContent", rawImproved);
    return {
      ...rest,
      content,
      contentUnreadable: rawContent !== null && content === null,
      improvedContent,
      improvedContentText: improvedContent ? renderResumeText(improvedContent) : null,
      templateId: resolveTemplateId(templateId, id),
      linkStyle: resolveLinkStyle(linkStyle, id),
      importedFrom: importedFrom && importedFrom.userId === userId ? { id: importedFrom.id, title: importedFrom.title } : null,
      latestImport,
    };
  });
}

const appearanceSchema = z
  .object({
    resumeId: z.string().min(1, "Required"),
    templateId: templateIdSchema.optional(),
    linkStyle: linkStyleSchema.optional(),
  })
  .refine((v) => v.templateId !== undefined || v.linkStyle !== undefined, "Pick a template or a link style");

/**
 * Saves the viewer template and/or link style (spec 0007). Writes only those two
 * columns, so content versions, analyses, and open editors are untouched (AC-5).
 */
export async function setResumeAppearance(input: {
  resumeId: string;
  templateId?: TemplateId;
  linkStyle?: LinkStyle;
}): Promise<ActionResult<{ templateId: TemplateId; linkStyle: LinkStyle }>> {
  return withAction(async (userId) => {
    const parsed = appearanceSchema.safeParse(input);
    if (!parsed.success) throw new Error(zodIssueMessage(parsed.error));
    const { resumeId, templateId, linkStyle } = parsed.data;

    const resume = await loadResumeWithAuth(userId, resumeId);
    if (resume.content === null) throw new Error("This resume has no sections");

    const { count } = await prisma.resume.updateMany({
      where: { id: resumeId, userId },
      data: { templateId, linkStyle },
    });
    if (count !== 1) throw new Error(RESUME_NOT_FOUND);

    revalidatePath(`/resumes/${resumeId}`);
    return {
      templateId: templateId ?? resolveTemplateId(resume.templateId, resumeId),
      linkStyle: linkStyle ?? resolveLinkStyle(resume.linkStyle, resumeId),
    };
  });
}

export async function deleteResume(id: string): Promise<ActionResult<void>> {
  return withAction(async (userId) => {
    await prisma.resume.deleteMany({
      where: { id, userId },
    });
    revalidatePath("/dashboard");
    revalidatePath("/resumes");
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
