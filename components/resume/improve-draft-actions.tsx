"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptImprovedContent, discardImprovedContent } from "@/actions/improve";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Accept or discard the AI improvement draft of a built resume (spec 0002, AC-14). */
export function ImproveDraftActions({ resumeId }: { resumeId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<"accept" | "discard" | null>(null);

  async function run(kind: "accept" | "discard") {
    if (pending) return;
    setPending(kind);
    try {
      const result =
        kind === "accept" ? await acceptImprovedContent(resumeId) : await discardImprovedContent(resumeId);
      if (result.success) {
        toast(kind === "accept" ? "Improvement applied to your resume" : "Improvement discarded", "success");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    } catch {
      toast("Could not reach the server. Try again.", "error");
    }
    setPending(null);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => run("accept")} loading={pending === "accept"} disabled={pending !== null}>
        {pending === "accept" ? "Applying..." : "Accept improvement"}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => run("discard")}
        loading={pending === "discard"}
        disabled={pending !== null}
      >
        {pending === "discard" ? "Discarding..." : "Discard"}
      </Button>
    </div>
  );
}
