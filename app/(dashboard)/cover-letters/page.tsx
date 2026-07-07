import { getCoverLetters } from "@/actions/cover-letter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function CoverLettersPage() {
  let coverLetters: { id: string; title: string | null; score: number | null; createdAt: Date }[] = [];
  try {
    const result = await getCoverLetters();
    if (result.success) coverLetters = result.data;
  } catch (error) {
    console.error("[cover-letters] page error:", error);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Cover Letters
        </h1>
        <p className="text-muted mt-1">
          Manage your uploaded cover letters
        </p>
      </div>

      {coverLetters.length === 0 ? (
        <Card variant="flat">
          <CardContent>
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gradient-warning/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No cover letters yet
              </h3>
              <p className="text-sm text-muted">
                Upload your first cover letter from the{" "}
                <Link href="/dashboard" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  dashboard
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coverLetters.map((cl) => (
            <Link key={cl.id} href={`/cover-letters/${cl.id}`}>
              <Card hover className="h-full">
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-warning/10 flex items-center justify-center shrink-0">
                      <svg className="w-4.5 h-4.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground truncate">
                        {cl.title}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        {new Date(cl.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  {cl.score != null && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Badge
                        variant={
                          cl.score >= 70
                            ? "success"
                            : cl.score >= 40
                              ? "warning"
                              : "danger"
                        }
                      >
                        Score: {cl.score}%
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
