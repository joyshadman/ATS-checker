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
      <label className="text-sm font-medium text-foreground">Job Description (Optional)</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="w-full rounded-xl border border-border bg-surface/40 p-4 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
