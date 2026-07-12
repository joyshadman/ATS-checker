"use client";

import { AlertCircle, CheckCircle2 } from "@/components/ui/icons";

interface ErrorBannerProps {
  message: string;
  variant?: "error" | "success";
  onDismiss?: () => void;
}

export function ErrorBanner({ message, variant = "error", onDismiss }: ErrorBannerProps) {
  if (variant === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="flex-1">{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="ml-auto text-green-400/70 hover:text-green-400">
            &times;
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-auto text-red-400/70 hover:text-red-400">
          &times;
        </button>
      )}
    </div>
  );
}
