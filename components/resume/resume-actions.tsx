"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteResume } from "@/actions/resume";
import { improveResume } from "@/actions/improve";
import { generateInterviewQuestions } from "@/actions/interview";
import { analyzeResume, matchResumeToJob } from "@/actions/analysis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  resumeId: string;
  hasAnalysis: boolean;
  hasImprovement: boolean;
  hasInterview: boolean;
};

export function ResumeActions({
  resumeId,
  hasAnalysis,
  hasImprovement,
  hasInterview,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showJobMatch, setShowJobMatch] = useState(false);
  const [jobDescription, setJobDescription] = useState("");

  async function handleAction(action: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setLoading(action);
    setError("");
    try {
      const result = await fn();
      if (!result.success) {
        setError(result.error ?? `${action} failed`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} failed`);
    }
    setLoading(null);
  }

  async function handleJobMatch() {
    if (!jobDescription.trim()) return;
    setLoading("match");
    setError("");
    try {
      const result = await matchResumeToJob(resumeId, jobDescription);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Job match failed");
    }
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {!hasAnalysis && (
          <Button
            onClick={() =>
              handleAction("analyze", () => analyzeResume(resumeId))
            }
            loading={loading === "analyze"}
            disabled={loading !== null}
          >
            {loading === "analyze" ? "Analyzing..." : "Run ATS Analysis"}
          </Button>
        )}

        {!hasImprovement && (
          <Button
            onClick={() =>
              handleAction("improve", () => improveResume(resumeId))
            }
            variant="secondary"
            loading={loading === "improve"}
            disabled={loading !== null}
          >
            {loading === "improve" ? "Improving..." : "Improve Resume"}
          </Button>
        )}

        {!hasInterview && (
          <Button
            onClick={() =>
              handleAction("interview", () =>
                generateInterviewQuestions(resumeId)
              )
            }
            variant="secondary"
            loading={loading === "interview"}
            disabled={loading !== null}
          >
            {loading === "interview" ? "Generating..." : "Interview Questions"}
          </Button>
        )}

        <Button
          onClick={() => setShowJobMatch(!showJobMatch)}
          variant="outline"
        >
          {showJobMatch ? "Cancel Job Match" : "Match to Job"}
        </Button>

        <Button
          onClick={async () => {
            const result = await deleteResume(resumeId);
            if (result.success) {
              router.push("/dashboard");
            } else {
              setError(result.error);
            }
          }}
          variant="danger"
          disabled={loading !== null}
        >
          Delete
        </Button>
      </div>

      {showJobMatch && (
        <Card variant="flat">
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <textarea
                className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[80px] resize-y"
                placeholder="Paste the job description to match against this resume..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <Button
                onClick={handleJobMatch}
                loading={loading === "match"}
                disabled={loading !== null || !jobDescription.trim()}
                className="self-start sm:self-end shrink-0"
              >
                {loading === "match" ? "Matching..." : "Match"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {hasAnalysis && <Badge variant="success">ATS analysis done</Badge>}
        {hasImprovement && (
          <Badge variant="info">Improvement generated</Badge>
        )}
        {hasInterview && (
          <Badge variant="primary">Interview questions ready</Badge>
        )}
      </div>
    </div>
  );
}
