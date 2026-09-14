import type { Metadata } from "next";
import { getResume } from "@/actions/resume";
import { ResumeActions } from "@/components/resume/resume-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreCircle } from "@/components/ui/score-circle";
import { notFound } from "next/navigation";
import { scoreToVariant } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getResume(id);
  if (!result.success) return { title: "Resume Not Found" };
  return { title: result.data.title };
}

type ResumePageData = {
  id: string;
  userId: string;
  title: string;
  originalText: string | null;
  improvedText: string | null;
  atsScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  analyses: Array<{
    formattingScore: number | null;
    keywordScore: number | null;
    skillsScore: number | null;
    experienceScore: number | null;
    educationScore: number | null;
    grammarScore: number | null;
    readabilityScore: number | null;
    missingKeywords: string | null;
    suggestions: string | null;
    overallImprovements: string | null;
  }>;
  interviews: Array<{
    questions: string | null;
  }>;
};

function SectionCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-surface/60 border border-border/60 p-4 space-y-2">
      <div className="text-xs font-medium text-muted uppercase tracking-wider">
        {label}
      </div>
      <div className="text-xl font-bold text-foreground tabular-nums">
        {value ?? "—"}
      </div>
      <div className="w-full h-1 rounded-full bg-border/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            value != null && scoreToVariant(value) === "success"
              ? "bg-gradient-success"
              : value != null && scoreToVariant(value) === "warning"
                ? "bg-gradient-warning"
                : "bg-gradient-error"
          }`}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export default async function ResumePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let resume: ResumePageData;
  try {
    const result = await getResume(id);
    if (!result.success) notFound();
    resume = result.data as ResumePageData;
  } catch {
    notFound();
  }

  const latestAnalysis = resume.analyses?.[0] ?? null;
  const latestInterview = resume.interviews?.[0] ?? null;

  const sections = latestAnalysis
    ? [
        { label: "Formatting", value: (latestAnalysis.formattingScore as number | null) ?? null },
        { label: "Keywords", value: (latestAnalysis.keywordScore as number | null) ?? null },
        { label: "Skills", value: (latestAnalysis.skillsScore as number | null) ?? null },
        { label: "Experience", value: (latestAnalysis.experienceScore as number | null) ?? null },
        { label: "Education", value: (latestAnalysis.educationScore as number | null) ?? null },
        { label: "Grammar", value: (latestAnalysis.grammarScore as number | null) ?? null },
        { label: "Readability", value: (latestAnalysis.readabilityScore as number | null) ?? null },
      ].filter((s) => s.value != null)
    : [];

  const missingKeywords = latestAnalysis?.missingKeywords
    ? (JSON.parse(latestAnalysis.missingKeywords as string) as string[])
    : [];
  const suggestions = latestAnalysis?.suggestions
    ? (JSON.parse(latestAnalysis.suggestions as string) as string[])
    : [];
  const overallImprovements = latestAnalysis?.overallImprovements
    ? (JSON.parse(latestAnalysis.overallImprovements as string) as string[])
    : [];

  const badgeVariant = resume.atsScore != null
    ? scoreToVariant(resume.atsScore) === "success"
      ? "success"
      : resume.atsScore >= 60
        ? "primary"
        : scoreToVariant(resume.atsScore) === "warning"
          ? "warning"
          : "danger"
    : "default";

  const badgeLabel = resume.atsScore != null
    ? resume.atsScore >= 80
      ? "Excellent"
      : resume.atsScore >= 60
        ? "Good"
        : resume.atsScore >= 40
          ? "Needs Work"
          : "Poor"
    : "Pending";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {resume.title}
          </h1>
          <p className="text-muted mt-1 text-sm">
            Uploaded{" "}
            {new Date(resume.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="animate-slide-up stagger-1">
        <ResumeActions
          resumeId={resume.id}
          hasAnalysis={!!latestAnalysis}
          hasImprovement={!!resume.improvedText}
          hasInterview={!!latestInterview}
        />
      </div>

      {resume.atsScore != null && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up stagger-2">
          <Card className="lg:col-span-1">
            <CardContent>
              <div className="flex flex-col items-center py-4">
                <ScoreCircle score={resume.atsScore} />
                <h3 className="text-lg font-semibold text-foreground mt-4">
                  Overall ATS Score
                </h3>
                <Badge variant={badgeVariant} className="mt-2">
                  {badgeLabel}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sections.map((s) => (
              <SectionCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {suggestions.length > 0 && (
          <Card className="animate-slide-up stagger-3">
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-gradient-success inline-block" />
                Key Strengths
              </h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-foreground"
                  >
                    <svg className="w-4 h-4 text-success mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {missingKeywords.length > 0 && (
          <Card className="animate-slide-up stagger-4">
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-gradient-error inline-block" />
                Missing Keywords
              </h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {missingKeywords.map((k, i) => (
                  <Badge key={i} variant="danger">
                    {k}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {overallImprovements.length > 0 && (
        <Card className="animate-slide-up stagger-5">
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-gradient-primary inline-block" />
              Improvements
            </h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {overallImprovements.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-foreground"
                >
                  <span className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center text-cream text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" />
              Original Resume
            </h2>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-surface/60 border border-border/60 p-5 text-sm text-foreground whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono leading-relaxed">
              {resume.originalText ?? "No text content"}
            </div>
          </CardContent>
        </Card>

        {resume.improvedText && (
          <Card className="animate-slide-up stagger-1">
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-gradient-success inline-block" />
                Improved Resume
              </h2>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-surface/60 border border-border/60 p-5 text-sm text-foreground whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono leading-relaxed">
                {resume.improvedText}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {latestInterview && latestInterview.questions && (
        <Card className="animate-slide-up">
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-gradient-warning inline-block" />
              Interview Questions
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(
                JSON.parse(latestInterview.questions as string) as {
                  type: string;
                  question: string;
                }[]
              ).map((q, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-surface/60 border border-border/60 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">{q.type}</Badge>
                    <span className="text-xs text-muted font-medium">
                      Q{i + 1}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{q.question}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
