import { getResume } from "@/actions/resume";
import { ResumeActions } from "@/components/resume/resume-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";

function ScoreCircle({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 80
      ? "stroke-emerald-500"
      : score >= 60
        ? "stroke-indigo-500"
        : score >= 40
          ? "stroke-amber-500"
          : "stroke-rose-500";
  const trackColor =
    score >= 80
      ? "stroke-emerald-100 dark:stroke-emerald-900"
      : score >= 60
        ? "stroke-indigo-100 dark:stroke-indigo-900"
        : score >= 40
          ? "stroke-amber-100 dark:stroke-amber-900"
          : "stroke-rose-100 dark:stroke-rose-900";

  return (
    <div className="relative w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          className={trackColor}
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

function SectionCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl bg-surface border p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-lg font-bold text-foreground">
        {value ?? "—"}
      </div>
      <div className="w-full h-1.5 rounded-full bg-border mt-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            value != null && value >= 70
              ? "bg-gradient-success"
              : value != null && value >= 40
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resume: any;
  try {
    const result = await getResume(id);
    if (!result.success) notFound();
    resume = result.data;
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {resume.title as string}
          </h1>
          <p className="text-muted mt-1">
            Uploaded{" "}
            {new Date(resume.createdAt as string | number | Date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <ResumeActions
        resumeId={resume.id}
        hasAnalysis={!!latestAnalysis}
        hasImprovement={!!resume.improvedText}
        hasInterview={!!latestInterview}
      />

      {resume.atsScore != null && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardContent>
              <div className="flex flex-col items-center py-4">
                <ScoreCircle score={resume.atsScore} />
                <h3 className="text-lg font-semibold text-foreground mt-4">
                  Overall ATS Score
                </h3>
                <Badge
                  variant={
                    resume.atsScore >= 80
                      ? "success"
                      : resume.atsScore >= 60
                        ? "primary"
                        : resume.atsScore >= 40
                          ? "warning"
                          : "danger"
                  }
                  className="mt-1"
                >
                  {resume.atsScore >= 80
                    ? "Excellent"
                    : resume.atsScore >= 60
                      ? "Good"
                      : resume.atsScore >= 40
                        ? "Needs Work"
                        : "Poor"}
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
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-success inline-block" />
                Key Strengths
              </h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {missingKeywords.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
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
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-primary inline-block" />
              Improvements
            </h2>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {overallImprovements.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
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
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" />
              Original Resume
            </h2>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-surface border p-4 text-sm text-foreground whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono leading-relaxed">
              {resume.originalText ?? "No text content"}
            </div>
          </CardContent>
        </Card>

        {resume.improvedText && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-success inline-block" />
                Improved Resume
              </h2>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-surface border p-4 text-sm text-foreground whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono leading-relaxed">
                {resume.improvedText}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {latestInterview && latestInterview.questions && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-warning inline-block" />
              Interview Questions
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(JSON.parse(latestInterview.questions as string) as { type: string; question: string }[]).map(
                (q, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-surface border p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{q.type}</Badge>
                      <span className="text-xs text-muted font-medium">
                        Q{i + 1}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{q.question}</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
