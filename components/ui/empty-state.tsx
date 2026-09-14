import { type ReactNode } from "react";
import { FileText } from "@/components/ui/icons";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  hint?: string;
}

export function EmptyState({ icon, message, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/50 py-16">
      {icon || <FileText className="mb-4 h-12 w-12 text-muted" />}
      <p className="text-lg font-medium text-foreground/70">{message}</p>
      {hint && <p className="mt-1 text-sm text-muted/80">{hint}</p>}
    </div>
  );
}
