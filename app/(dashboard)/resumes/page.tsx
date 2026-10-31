import type { Metadata } from "next";
import Link from "next/link";
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
    contentUpdatedAt: Date | null;
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
        // Timestamp only (never content): non null means built in the editor.
        contentUpdatedAt: true,
      },
    });
  } catch (error) {
    console.error("[resumes] page error:", error);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Resumes
          </h1>
          <p className="text-muted mt-1 text-sm">
            Browse, search, and manage the resumes you built or uploaded
          </p>
        </div>
        <Link
          href="/resumes/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-cream shadow-sm hover:brightness-110 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New resume
        </Link>
      </div>
      <ResumeList resumes={resumes} />
    </div>
  );
}
