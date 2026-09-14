"use client";

import { FileText } from "@/components/ui/icons";

interface Resume {
  id: string;
  title: string;
}

interface ResumeSelectorProps {
  resumes: Resume[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ResumeSelector({ resumes, selectedId, onSelect }: ResumeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Select Resume</label>
      <div className="space-y-2">
        {resumes.map((resume) => (
          <button
            key={resume.id}
            onClick={() => onSelect(resume.id)}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              selectedId === resume.id
                ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                : "border-border hover:border-accent/40 hover:bg-surface/50"
            }`}
          >
            <FileText className="h-5 w-5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{resume.title}</p>
            </div>
            {selectedId === resume.id && (
              <div className="h-2 w-2 shrink-0 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
