"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { deleteCoverLetter } from "@/actions/cover-letter";
import { analyzeCoverLetter } from "@/actions/analysis";
import { improveCoverLetter } from "@/actions/improve";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  coverLetterId: string;
  hasImprovement: boolean;
};

export function CoverLetterActions({ coverLetterId, hasImprovement }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const pendingRef = useRef(false);

  async function handleAction(action: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    if (pendingRef.current) return;
    pendingRef.current = true;
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
    pendingRef.current = false;
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() =>
            handleAction("analyze", () =>
              analyzeCoverLetter(coverLetterId, jobDescription || undefined)
            )
          }
          loading={loading === "analyze"}
          disabled={loading !== null}
        >
          {loading === "analyze" ? "Analyzing..." : "Analyze"}
        </Button>

        {!hasImprovement && (
          <Button
            onClick={() =>
              handleAction("improve", () =>
                improveCoverLetter(coverLetterId, jobDescription || undefined)
              )
            }
            variant="secondary"
            loading={loading === "improve"}
            disabled={loading !== null}
          >
            {loading === "improve" ? "Improving..." : "Improve"}
          </Button>
        )}

        <Button
          onClick={async () => {
            const result = await deleteCoverLetter(coverLetterId);
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

      <textarea
        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40 min-h-[80px] resize-y"
        placeholder="Paste job description for targeted analysis (optional)"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      {hasImprovement && <Badge variant="info">Improvement generated</Badge>}

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
}
