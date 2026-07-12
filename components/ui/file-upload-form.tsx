"use client";

import { Upload, FileText } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

interface FileUploadFormProps {
  action: (formData: FormData) => Promise<{ success: boolean; id?: string; error?: string }>;
  redirectPath: (id: string) => string;
  accept: string;
  label: string;
  description: string;
  accentColor?: string;
  emptyStateMessage?: string;
  emptyStateHint?: string;
}

export function FileUploadForm({
  action,
  redirectPath,
  accept,
  label,
  description,
  accentColor = "bg-zinc-100",
  emptyStateMessage,
  emptyStateHint,
}: FileUploadFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSubmit(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSubmit(file);
  };

  const handleSubmit = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await action(formData);
      if (result.success && result.id) {
        window.location.href = redirectPath(result.id);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
          isDragging
            ? "border-zinc-400 bg-zinc-800/50"
            : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/20"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${accentColor}/10`}>
            <Upload className="h-8 w-8 text-zinc-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-zinc-100">{label}</p>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
          <Button
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Choose File"}
          </Button>
        </div>
      </div>

      {emptyStateMessage && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50 py-16">
          <FileText className="mb-4 h-12 w-12 text-zinc-700" />
          <p className="text-lg font-medium text-zinc-500">{emptyStateMessage}</p>
          {emptyStateHint && <p className="mt-1 text-sm text-zinc-600">{emptyStateHint}</p>}
        </div>
      )}
    </div>
  );
}
