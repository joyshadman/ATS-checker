"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createResume } from "@/actions/resume";
import { titleSchema } from "@/lib/resume/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBanner } from "@/components/ui/error-banner";

const TITLE_PREFIX = "title: ";

export function NewResumeForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const parsed = titleSchema.safeParse(title);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid title");
      return;
    }
    setFieldError(null);

    setPending(true);
    const result = await createResume(parsed.data);
    if (result.success) {
      router.push(`/resumes/${result.data.id}/edit`);
      return;
    }
    setPending(false);
    if (result.error.startsWith(TITLE_PREFIX)) {
      setFieldError(result.error.slice(TITLE_PREFIX.length));
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Input
        id="new-resume-title"
        label="Resume title"
        placeholder="e.g. Frontend Engineer 2026"
        value={title}
        maxLength={200}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        error={fieldError ?? undefined}
        disabled={pending}
      />
      <p className="text-xs text-muted -mt-2">
        Only you see the title. Name it after the role or version so you can tell resumes apart.
      </p>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {pending ? "Creating..." : "Create and start editing"}
      </Button>
    </form>
  );
}
