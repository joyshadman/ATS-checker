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
      <label className="text-sm font-medium text-zinc-300">Select Resume</label>
      <div className="space-y-2">
        {resumes.map((resume) => (
          <button
            key={resume.id}
            onClick={() => onSelect(resume.id)}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              selectedId === resume.id
                ? "border-zinc-500 bg-zinc-800"
                : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
            }`}
          >
            <FileText className="h-5 w-5 shrink-0 text-zinc-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{resume.title}</p>
            </div>
            {selectedId === resume.id && (
              <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
