import type { Metadata } from "next";
import { getCoverLetter } from "@/actions/cover-letter";
import { CoverLetterActions } from "@/components/cover-letter/cover-letter-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { scoreToVariant } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCoverLetter(id);
  if (!result.success) return { title: "Cover Letter Not Found" };
  return { title: result.data.title ?? "Cover Letter" };
}

type CoverLetterPageData = {
  id: string;
  userId: string;
  title: string | null;
  originalText: string | null;
  improvedText: string | null;
  score: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export default async function CoverLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let coverLetter: CoverLetterPageData;
  try {
    const result = await getCoverLetter(id);
    if (!result.success) notFound();
    coverLetter = result.data as CoverLetterPageData;
  } catch {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {coverLetter.title}
        </h1>
        <p className="text-muted mt-1 text-sm">
          Uploaded{" "}
          {new Date(coverLetter.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="animate-slide-up stagger-1">
        <CoverLetterActions
          coverLetterId={coverLetter.id}
          hasImprovement={!!coverLetter.improvedText}
        />
      </div>

      {coverLetter.score != null && (
        <Card className="animate-slide-up stagger-2">
          <CardContent>
            <div className="flex items-center gap-5">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-sm ${
                  scoreToVariant(coverLetter.score) === "success"
                    ? "bg-gradient-success"
                    : scoreToVariant(coverLetter.score) === "warning"
                      ? "bg-gradient-warning"
                      : "bg-gradient-error"
                }`}
              >
                {coverLetter.score}
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">
                  Overall Score
                </div>
                <p className="text-sm text-muted">
                  {coverLetter.score >= 70
                    ? "Great cover letter!"
                    : coverLetter.score >= 40
                      ? "Some improvements needed"
                      : "Needs significant work"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up stagger-3">
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" />
              Original
            </h2>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-surface/60 border border-border/60 p-5 text-sm text-foreground whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono leading-relaxed">
              {coverLetter.originalText ?? "No text content"}
            </div>
          </CardContent>
        </Card>

        {coverLetter.improvedText && (
          <Card className="animate-slide-up stagger-4">
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-gradient-success inline-block" />
                Improved Version
              </h2>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-surface/60 border border-border/60 p-5 text-sm text-foreground whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono leading-relaxed">
                {coverLetter.improvedText}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
