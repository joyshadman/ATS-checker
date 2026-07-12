"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadResume } from "@/actions/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VALID_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export function ResumeUploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File) => {
    if (!VALID_TYPES.includes(f.type) && !f.name.endsWith(".txt")) {
      setError("Only PDF, DOCX, and TXT files are supported");
      return false;
    }
    return true;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f && validateFile(f)) {
        setFile(f);
        setError("");
      }
    },
    [validateFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f && validateFile(f)) {
        setFile(f);
        setError("");
      }
    },
    [validateFile],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    try {
      const result = await uploadResume(form);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push(`/resumes/${result.data.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="title"
        label="Resume Title"
        placeholder='e.g. "Software Engineer 2024"'
        required
      />

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.01]"
            : file
              ? "border-indigo-300 dark:border-indigo-700/60 bg-indigo-50/50 dark:bg-indigo-500/5"
              : "border-border hover:border-indigo-300 dark:hover:border-indigo-700/60 bg-surface/30 hover:bg-surface/60"
        }`}
      >
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />

        {file ? (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary/10 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-surface border border-border/60 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm text-muted">
              <span className="font-medium text-foreground">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="text-xs text-muted/70">
              PDF, DOCX, or TXT (max 10MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/60 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !file}
        loading={loading}
        className="w-full"
      >
        {loading ? "Uploading..." : "Upload Resume"}
      </Button>
    </form>
  );
}
