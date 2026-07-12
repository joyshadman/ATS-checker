"use client";

import { useState, useEffect } from "react";
import { getResumes } from "@/actions/resume";
import { analyzeResume, matchResumeToJob } from "@/actions/analysis";
import type { ATSAnalysisResponse, JobMatchResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageHeader } from "@/components/ui/page-header";
import { ResumeSelector } from "@/components/ui/resume-selector";
import { JobDescriptionInput } from "@/components/ui/job-description-input";
import { useAsyncAction } from "@/hooks/use-async-action";
import { scoreToVariant } from "@/lib/utils";
import { BarChart3 } from "@/components/ui/icons";

export default function AnalyzePage() {
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<ATSAnalysisResponse | null>(null);
  const [match, setMatch] = useState<JobMatchResponse | null>(null);
  const { isPending, error, execute, reset } = useAsyncAction();

  useEffect(() => {
    getResumes().then((result) => {
      if (result.success) setResumes(result.data);
    });
  }, []);

  async function handleAnalyze() {
    if (!selectedId) return;
    await execute(async () => {
      const result = await analyzeResume(selectedId, jobDescription || undefined);
      if (!result.success) return result.error;
      setAnalysis(result.data);
      setMatch(null);
      return null;
    });
  }

  async function handleMatch() {
    if (!selectedId || !jobDescription) return;
    await execute(async () => {
      const result = await matchResumeToJob(selectedId, jobDescription);
      if (!result.success) return result.error;
      setMatch(result.data);
      setAnalysis(null);
      return null;
    });
  }

  const analysisSections = analysis
    ? [
        { label: "Formatting", value: analysis.formattingScore },
        { label: "Keywords", value: analysis.keywordScore },
        { label: "Skills", value: analysis.skillsScore },
        { label: "Experience", value: analysis.experienceScore },
        { label: "Education", value: analysis.educationScore },
        { label: "Grammar", value: analysis.grammarScore },
        { label: "Readability", value: analysis.readabilityScore },
      ]
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        icon={<BarChart3 className="h-6 w-6" />}
        title="Analyze Resume"
        description="Run ATS analysis or match a resume to a specific job description"
      />

      <Card className="animate-slide-up stagger-1">
        <CardContent className="space-y-4">
          <ResumeSelector
            resumes={resumes}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <JobDescriptionInput
            value={jobDescription}
            onChange={setJobDescription}
          />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={isPending || !selectedId}
              loading={isPending}
            >
              {isPending ? "Analyzing..." : "Run ATS Analysis"}
            </Button>
            <Button
              onClick={handleMatch}
              disabled={isPending || !selectedId || !jobDescription.trim()}
              variant="secondary"
              loading={isPending}
            >
              {isPending ? "Matching..." : "Match to Job"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <ErrorBanner message={error} onDismiss={reset} />}

      {analysis && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-gradient-primary inline-block" />
                ATS Analysis Results
              </h2>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-5 p-4 rounded-xl bg-surface/60 border border-border/60">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-sm ${
                    scoreToVariant(analysis.atsScore) === "success"
                      ? "bg-gradient-success"
                      : scoreToVariant(analysis.atsScore) === "warning"
                        ? "bg-gradient-warning"
                        : "bg-gradient-error"
                  }`}
                >
                  {analysis.atsScore}
                </div>
                <div>
                  <div className="text-lg font-semibold text-foreground">
                    Overall ATS Score
                  </div>
                  <p className="text-sm text-muted">
                    {analysis.atsScore >= 80
                      ? "Excellent — well optimized for ATS"
                      : analysis.atsScore >= 60
                        ? "Good — minor improvements recommended"
                        : analysis.atsScore >= 40
                          ? "Fair — needs significant improvements"
                          : "Poor — major changes needed"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {analysisSections.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl bg-surface/60 border border-border/60 p-3 space-y-1.5"
                  >
                    <div className="text-xs font-medium text-muted uppercase tracking-wider">
                      {s.label}
                    </div>
                    <div className="text-lg font-bold text-foreground tabular-nums">
                      {s.value}
                    </div>
                    <div className="w-full h-1 rounded-full bg-border/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          scoreToVariant(s.value) === "success"
                            ? "bg-gradient-success"
                            : scoreToVariant(s.value) === "warning"
                              ? "bg-gradient-warning"
                              : "bg-gradient-error"
                        }`}
                        style={{ width: `${s.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {analysis.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                    Strengths
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">
                    Weaknesses
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.weaknesses.map((w, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <svg className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.missingKeywords.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Missing Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missingKeywords.map((k, i) => (
                      <Badge key={i} variant="danger">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Recommendations
                  </h3>
                  <ul className="space-y-2.5">
                    {analysis.recommendations.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-foreground"
                      >
                        <span className="w-5 h-5 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {match && (
        <Card className="animate-fade-in">
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" />
              Job Match Results
            </h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-sm ${
                  scoreToVariant(match.matchPercentage) === "success"
                    ? "bg-gradient-success"
                    : scoreToVariant(match.matchPercentage) === "warning"
                      ? "bg-gradient-warning"
                      : "bg-gradient-error"
                }`}
              >
                {match.matchPercentage}%
              </div>
              <div>
                <Progress
                  value={match.matchPercentage}
                  label="Match Score"
                  size="lg"
                  className="w-48"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {match.matchingSkills.length > 0 && (
                <div className="rounded-xl bg-surface/60 border border-border/60 p-4">
                  <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                    Matching Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matchingSkills.map((s, i) => (
                      <Badge key={i} variant="success">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {match.missingSkills.length > 0 && (
                <div className="rounded-xl bg-surface/60 border border-border/60 p-4">
                  <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">
                    Missing Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missingSkills.map((s, i) => (
                      <Badge key={i} variant="danger">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {match.suggestions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Suggestions
                </h3>
                <ul className="space-y-2.5">
                  {match.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-foreground"
                    >
                      <span className="w-5 h-5 rounded-full bg-gradient-accent flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
