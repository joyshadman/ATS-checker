import { requireAuth } from "@/actions/auth";
import { prisma } from "@/lib/prisma/db";
import Link from "next/link";
import { ResumeUploadForm } from "@/components/forms/resume-upload-form";
import { CoverLetterUploadForm } from "@/components/forms/cover-letter-upload-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const user = await requireAuth();

  const [totalResumes, stats, recentResumes, totalCoverLetters] =
    await Promise.all([
      prisma.resume.count({ where: { userId: user.id } }),
      prisma.resume.aggregate({
        where: { userId: user.id },
        _avg: { atsScore: true },
        _max: { atsScore: true },
      }),
      prisma.resume.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          atsScore: true,
          updatedAt: true,
        },
      }),
      prisma.coverLetter.count({ where: { userId: user.id } }),
    ]);

  const avgScore = stats._avg.atsScore;
  const maxScore = stats._max.atsScore;

  const statsCards = [
    {
      label: "Resumes Analyzed",
      value: totalResumes,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      gradient: "bg-gradient-primary",
      sub: "Total uploads",
    },
    {
      label: "Average ATS Score",
      value: avgScore != null ? `${Math.round(avgScore)}%` : "—",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      gradient: avgScore != null && avgScore >= 70 ? "bg-gradient-success" : avgScore != null && avgScore >= 40 ? "bg-gradient-warning" : "bg-gradient-primary",
      sub: "Across all resumes",
    },
    {
      label: "Highest Score",
      value: maxScore != null ? `${maxScore}%` : "—",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      gradient: "bg-gradient-accent",
      sub: "Best performer",
    },
    {
      label: "Cover Letters",
      value: totalCoverLetters,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      gradient: "bg-gradient-warning",
      sub: "Uploaded",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted mt-1">
          Welcome back, {user.name ?? user.email}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((s) => (
          <Card key={s.label} hover>
            <CardContent>
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-9 h-9 rounded-xl ${s.gradient} flex items-center justify-center text-white shadow-sm`}
                >
                  {s.icon}
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {s.value}
              </div>
              <div className="text-sm text-muted mt-0.5">{s.label}</div>
              <div className="text-xs text-muted/70 mt-0.5">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-primary inline-block" />
              Upload Resume
            </h2>
          </CardHeader>
          <CardContent>
            <ResumeUploadForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-warning inline-block" />
              Upload Cover Letter
            </h2>
          </CardHeader>
          <CardContent>
            <CoverLetterUploadForm />
          </CardContent>
        </Card>
      </div>

      {recentResumes.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" />
              Recent Activity
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentResumes.map((r) => (
                <Link
                  key={r.id}
                  href={`/resumes/${r.id}`}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm hover:bg-card-hover transition-all duration-150 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-card flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-foreground truncate block">
                        {r.title}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(r.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {r.atsScore != null ? (
                      <Badge
                        variant={
                          r.atsScore >= 70
                            ? "success"
                            : r.atsScore >= 40
                              ? "warning"
                              : "danger"
                        }
                      >
                        {r.atsScore}%
                      </Badge>
                    ) : (
                      <Badge variant="default">Not analyzed</Badge>
                    )}
                    <svg
                      className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Link
                href="/resumes"
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
              >
                View all resumes
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {totalResumes === 0 && (
        <Card variant="flat">
          <CardContent>
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No resumes yet
              </h3>
              <p className="text-sm text-muted max-w-sm mx-auto">
                Upload your first resume to get an ATS analysis, improvement
                suggestions, and interview preparation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
