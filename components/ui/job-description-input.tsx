"use client";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function JobDescriptionInput({
  value,
  onChange,
  placeholder = "Paste the job description here to get a targeted analysis of how well your resume matches...",
}: JobDescriptionInputProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-300">Job Description (Optional)</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-zinc-600"
      />
    </div>
  );
}
