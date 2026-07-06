"use client";

import { useState, useEffect } from "react";
import { getResumes } from "@/actions/resume";
import { generateInterviewQuestions } from "@/actions/interview";
import type { InterviewQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function InterviewPage() {
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // overview of the code: This is a React component that allows users to generate interview questions based on their selected resume and an optional job description. It fetches resumes, handles user input, and displays generated questions with preparation guides.
  useEffect(() => {
    getResumes().then(setResumes);
  }, []);

  async function handleGenerate() {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const result = await generateInterviewQuestions(
        selectedId,
        jobDescription || undefined
      );
      setQuestions(result.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    }
    setLoading(false);
  }

  const typeVariants: Record<string, "primary" | "info" | "warning" | "success" | "danger"> = {
    hr: "primary",
    technical: "info",
    behavioral: "warning",
    project: "success",
    experience: "danger",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Interview Preparation
        </h1>
        <p className="text-muted mt-1">
          Generate tailored interview questions based on your resume
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
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

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Job Description
            </label>
            <textarea
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[100px] resize-y"
              placeholder="Paste job description for tailored questions (optional)"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            loading={loading}
            disabled={loading || !selectedId}
          >
            {loading ? "Generating..." : "Generate Interview Questions"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Generated Questions
          </h2>
          {questions.map((q, i) => (
            <Card key={i}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                    {i + 1}
                  </span>
                  <Badge variant={typeVariants[q.type] ?? "default"}>
                    {q.type}
                  </Badge>
                </div>
                <p className="text-sm text-foreground font-medium">
                  {q.question}
                </p>

                <details className="group text-sm">
                  <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors list-none flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    View preparation guide
                  </summary>
                  <div className="mt-3 space-y-3 pl-5">
                    <div>
                      <span className="font-medium text-foreground">Ideal answer: </span>
                      <span className="text-muted">{q.idealAnswer}</span>
                    </div>

                    {q.tips.length > 0 && (
                      <div>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider">
                          Tips
                        </span>
                        <ul className="mt-1 space-y-1">
                          {q.tips.map((t, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2 text-muted"
                            >
                              <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {q.commonMistakes.length > 0 && (
                      <div>
                        <span className="font-medium text-rose-600 dark:text-rose-400 text-xs uppercase tracking-wider">
                          Common Mistakes
                        </span>
                        <ul className="mt-1 space-y-1">
                          {q.commonMistakes.map((m, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2 text-muted"
                            >
                              <svg className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
