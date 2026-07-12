"use client";

import { useState, useEffect } from "react";
import { getResumes } from "@/actions/resume";
import { generateInterviewQuestions } from "@/actions/interview";
import type { InterviewQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { PageHeader } from "@/components/ui/page-header";
import { ResumeSelector } from "@/components/ui/resume-selector";
import { JobDescriptionInput } from "@/components/ui/job-description-input";
import { useAsyncAction } from "@/hooks/use-async-action";
import { Mic } from "@/components/ui/icons";

export default function InterviewPage() {
  const [resumes, setResumes] = useState<{ id: string; title: string }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const { isPending, error, execute, reset } = useAsyncAction();

  useEffect(() => {
    getResumes().then((result) => {
      if (result.success) setResumes(result.data);
    });
  }, []);

  async function handleGenerate() {
    if (!selectedId) return;
    await execute(async () => {
      const result = await generateInterviewQuestions(selectedId, jobDescription || undefined);
      if (!result.success) return result.error;
      setQuestions(result.data.questions);
      return null;
    });
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
      <PageHeader
        icon={<Mic className="h-6 w-6" />}
        title="Interview Preparation"
        description="Generate tailored interview questions based on your resume"
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
            placeholder="Paste job description for tailored questions (optional)"
          />

          <Button
            onClick={handleGenerate}
            loading={isPending}
            disabled={isPending || !selectedId}
          >
            {isPending ? "Generating..." : "Generate Interview Questions"}
          </Button>
        </CardContent>
      </Card>

      {error && <ErrorBanner message={error} onDismiss={reset} />}

      {questions.length > 0 && (
        <div className="space-y-4 animate-fade-in">
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
                  <summary className="cursor-pointer text-foreground hover:text-accent font-medium transition-colors list-none flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                    View preparation guide
                  </summary>
                  <div className="mt-3 space-y-3 pl-5">
                    <div>
                      <span className="font-medium text-foreground">
                        Ideal answer:{" "}
                      </span>
                      <span className="text-muted">{q.idealAnswer}</span>
                    </div>

                    {q.tips.length > 0 && (
                      <div>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider">
                          Tips
                        </span>
                        <ul className="mt-1.5 space-y-1">
                          {q.tips.map((t, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2 text-muted"
                            >
                              <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 13l4 4L19 7" />
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
                        <ul className="mt-1.5 space-y-1">
                          {q.commonMistakes.map((m, j) => (
                            <li
                              key={j}
                              className="flex items-start gap-2 text-muted"
                            >
                              <svg className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 18L18 6M6 6l12 12" />
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
