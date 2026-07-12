"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCoverLetter } from "@/actions/cover-letter";
import { analyzeCoverLetter } from "@/actions/analysis";
import { improveCoverLetter } from "@/actions/improve";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/ui/error-banner";
import { JobDescriptionInput } from "@/components/ui/job-description-input";
import { useAsyncAction } from "@/hooks/use-async-action";

type Props = {
  coverLetterId: string;
  hasImprovement: boolean;
};

export function CoverLetterActions({ coverLetterId, hasImprovement }: Props) {
  const router = useRouter();
  const { isPending, error, execute, reset } = useAsyncAction();
  const [activeAction, setActiveAction] = useState<string | null>(null);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            handleAction("analyze", () =>
              analyzeCoverLetter(coverLetterId, jobDescription || undefined),
            )
          }
          loading={activeAction === "analyze"}
          disabled={isPending}
          size="sm"
        >
          {activeAction === "analyze" ? "Analyzing..." : "Analyze"}
        </Button>

        {!hasImprovement && (
          <Button
            onClick={() =>
              handleAction("improve", () =>
                improveCoverLetter(
                  coverLetterId,
                  jobDescription || undefined,
                ),
              )
            }
            variant="secondary"
            loading={activeAction === "improve"}
            disabled={isPending}
            size="sm"
          >
            {activeAction === "improve" ? "Improving..." : "Improve"}
          </Button>
        )}

        <Button
          onClick={async () => {
            const result = await deleteCoverLetter(coverLetterId);
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

      <JobDescriptionInput
        value={jobDescription}
        onChange={setJobDescription}
        placeholder="Paste job description for targeted analysis (optional)"
      />

      {hasImprovement && <Badge variant="info">Improvement generated</Badge>}

      {error && <ErrorBanner message={error} onDismiss={reset} />}
    </div>
  );
}
