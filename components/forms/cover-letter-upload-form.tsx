"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadCoverLetter } from "@/actions/cover-letter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VALID_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export function CoverLetterUploadForm() {
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
    [validateFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f && validateFile(f)) {
        setFile(f);
        setError("");
      }
    },
    [validateFile]
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
      const result = await uploadCoverLetter(form);
      if (!result.success) {
        setError(result.error);
      } else {
        router.push(`/cover-letters/${result.data.id}`);
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
        label="Cover Letter Title"
        placeholder='e.g. "Application to Google"'
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
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-150 ${
          dragging
            ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
            : "border-border hover:border-amber-300 dark:hover:border-amber-700 bg-surface/50 hover:bg-surface"
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
            <div className="w-10 h-10 rounded-xl bg-gradient-warning/10 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-surface border flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm text-muted">
              <span className="font-medium text-foreground">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted">PDF, DOCX, or TXT (max 10MB)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading || !file} loading={loading} variant="secondary" className="w-full">
        {loading ? "Uploading..." : "Upload Cover Letter"}
      </Button>
    </form>
  );
}
