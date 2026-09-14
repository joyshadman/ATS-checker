"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Resume = {
  id: string;
  title: string;
  atsScore: number | null;
  createdAt: Date;
};

type SortKey = "newest" | "oldest" | "score";

export function ResumeList({ resumes: initial }: { resumes: Resume[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? initial.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.atsScore != null && String(r.atsScore).includes(q)),
        )
      : [...initial];

    list.sort((a, b) => {
      if (sort === "newest")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sort === "oldest")
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (sort === "score") return (b.atsScore ?? 0) - (a.atsScore ?? 0);
      return 0;
    });

    return list;
  }, [initial, search, sort]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    setDeleting(id);
    try {
      const { deleteResume } = await import("@/actions/resume");
      await deleteResume(id);
      toast("Resume deleted", "success");
      router.refresh();
    } catch {
      toast("Failed to delete resume", "error");
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-4 animate-slide-up stagger-1">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            type="text"
            placeholder="Search resumes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="score">Highest score</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 bg-surface/30 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">
            {search ? "No resumes match your search" : "No resumes uploaded yet"}
          </p>
          <p className="text-xs text-muted mt-1">
            {search
              ? "Try a different search term"
              : "Upload your first resume from the dashboard"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, i) => {
            const scoreVariant =
              r.atsScore != null
                ? r.atsScore >= 70
                  ? "success"
                  : r.atsScore >= 40
                    ? "warning"
                    : "danger"
                : "default";
            return (
              <Link
                key={r.id}
                href={`/resumes/${r.id}`}
                className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 hover:bg-card-hover hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group animate-slide-up"
                style={{ animationDelay: `${(i + 2) * 40}ms` }}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-card flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {r.title}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <Badge variant={scoreVariant}>
                    {r.atsScore != null ? `${r.atsScore}%` : "Pending"}
                  </Badge>
                  <button
                    onClick={(e) => handleDelete(r.id, e)}
                    disabled={deleting === r.id}
                    className="rounded-lg p-1.5 text-muted opacity-0 group-hover:opacity-100 hover:text-danger hover:bg-danger/10 transition-all disabled:opacity-50"
                    aria-label="Delete resume"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
