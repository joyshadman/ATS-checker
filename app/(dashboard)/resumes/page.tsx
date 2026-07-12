import type { Metadata } from "next";
import { requireAuth } from "@/actions/auth";
import { prisma } from "@/lib/prisma/db";
import { ResumeList } from "@/components/resume/resume-list";

export const metadata: Metadata = {
  title: "Resumes",
  description: "Browse, search, and manage your uploaded resumes with ATS scores.",
};

export default async function ResumesPage() {
  const user = await requireAuth();

  let resumes: {
    id: string;
    title: string;
    atsScore: number | null;
    createdAt: Date;
  }[] = [];
  try {
    resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        atsScore: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("[resumes] page error:", error);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Resumes
        </h1>
        <p className="text-muted mt-1 text-sm">
          Browse, search, and manage your uploaded resumes
        </p>
      </div>
      <ResumeList resumes={resumes} />
    </div>
  );
}
