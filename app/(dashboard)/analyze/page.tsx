"use client";

import { useState, useEffect } from "react";
import { getResumes } from "@/actions/resume";
import { analyzeResume, matchResumeToJob } from "@/actions/analysis";
import type { ATSAnalysisResponse, JobMatchResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function AnalyzePage() {
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<ATSAnalysisResponse | null>(null);
  const [match, setMatch] = useState<JobMatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getResumes().then(setResumes);
  }, []);

  async function handleAnalyze() {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const a = await analyzeResume(selectedId, jobDescription || undefined);
      setAnalysis(a);
      setMatch(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    }
    setLoading(false);
  }

  async function handleMatch() {
    if (!selectedId || !jobDescription) return;
    setLoading(true);
    setError("");
    try {
      const m = await matchResumeToJob(selectedId, jobDescription);
      setMatch(m);
      setAnalysis(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Match failed");
    }
    setLoading(false);
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
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Analyze Resume
        </h1>
        <p className="text-muted mt-1">
          Run ATS analysis or match a resume to a specific job description
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                Select Resume
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="">Choose a resume...</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Job Description
            </label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[120px] resize-y"
              placeholder="Paste job description here for targeted analysis (optional)"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={loading || !selectedId}
              loading={loading && !match}
            >
              {loading && !match ? "Analyzing..." : "Run ATS Analysis"}
            </Button>
            <Button
              onClick={handleMatch}
              disabled={loading || !selectedId || !jobDescription.trim()}
              variant="secondary"
              loading={loading && !!match}
            >
              {loading && match ? "Matching..." : "Match to Job"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-primary inline-block" />
                ATS Analysis Results
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-sm ${
                    analysis.atsScore >= 70
                      ? "bg-gradient-success"
                      : analysis.atsScore >= 40
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
                  <div key={s.label} className="rounded-xl bg-surface border p-3">
                    <div className="text-xs text-muted mb-1">{s.label}</div>
                    <div className="text-lg font-bold text-foreground">
                      {s.value}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-border mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          s.value >= 70
                            ? "bg-gradient-success"
                            : s.value >= 40
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
                  <ul className="space-y-1">
                    {analysis.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                  <ul className="space-y-1">
                    {analysis.weaknesses.map((w, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <svg className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                  <ul className="space-y-2">
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
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" />
              Job Match Results
            </h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-sm ${
                  match.matchPercentage >= 70
                    ? "bg-gradient-success"
                    : match.matchPercentage >= 40
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
                <div className="rounded-xl bg-surface border p-4">
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
                <div className="rounded-xl bg-surface border p-4">
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
                <ul className="space-y-2">
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
