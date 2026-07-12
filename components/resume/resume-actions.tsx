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
import { ErrorBanner } from "@/components/ui/error-banner";
import { JobDescriptionInput } from "@/components/ui/job-description-input";
import { useAsyncAction } from "@/hooks/use-async-action";

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
  const { isPending, error, execute, reset } = useAsyncAction();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showJobMatch, setShowJobMatch] = useState(false);
  const [jobDescription, setJobDescription] = useState("");

  async function handleAction(action: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setActiveAction(action);
    const result = await execute(async () => {
      const res = await fn();
      if (!res.success) return res.error ?? `${action} failed`;
      router.refresh();
      return null;
    });
    setActiveAction(null);
    return result;
  }

  async function handleJobMatch() {
    if (!jobDescription.trim()) return;
    await handleAction("match", () => matchResumeToJob(resumeId, jobDescription));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!hasAnalysis && (
          <Button
            onClick={() => handleAction("analyze", () => analyzeResume(resumeId))}
            loading={activeAction === "analyze"}
            disabled={isPending}
            size="sm"
          >
            {activeAction === "analyze" ? "Analyzing..." : "Run ATS Analysis"}
          </Button>
        )}

        {!hasImprovement && (
          <Button
            onClick={() => handleAction("improve", () => improveResume(resumeId))}
            variant="secondary"
            loading={activeAction === "improve"}
            disabled={isPending}
            size="sm"
          >
            {activeAction === "improve" ? "Improving..." : "Improve Resume"}
          </Button>
        )}

        {!hasInterview && (
          <Button
            onClick={() => handleAction("interview", () => generateInterviewQuestions(resumeId))}
            variant="secondary"
            loading={activeAction === "interview"}
            disabled={isPending}
            size="sm"
          >
            {activeAction === "interview" ? "Generating..." : "Interview Questions"}
          </Button>
        )}

        <Button
          onClick={() => setShowJobMatch(!showJobMatch)}
          variant="outline"
          size="sm"
        >
          {showJobMatch ? "Cancel Job Match" : "Match to Job"}
        </Button>

        <Button
          onClick={async () => {
            const result = await deleteResume(resumeId);
            if (result.success) {
              router.push("/dashboard");
            } else {
              reset();
            }
          }}
          variant="danger"
          disabled={isPending}
          size="sm"
        >
          Delete
        </Button>
      </div>

      {showJobMatch && (
        <Card variant="flat">
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <JobDescriptionInput
                value={jobDescription}
                onChange={setJobDescription}
                placeholder="Paste the job description to match against this resume..."
              />
              <Button
                onClick={handleJobMatch}
                loading={activeAction === "match"}
                disabled={isPending || !jobDescription.trim()}
                className="self-start sm:self-end shrink-0"
                size="sm"
              >
                {activeAction === "match" ? "Matching..." : "Match"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <ErrorBanner message={error} onDismiss={reset} />}

      <div className="flex flex-wrap gap-2">
        {hasAnalysis && <Badge variant="success">ATS analysis done</Badge>}
        {hasImprovement && <Badge variant="info">Improvement generated</Badge>}
        {hasInterview && (
          <Badge variant="primary">Interview questions ready</Badge>
        )}
      </div>
    </div>
  );
}
