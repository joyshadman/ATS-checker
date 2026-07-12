import { type ReactNode } from "react";
import { FileText } from "@/components/ui/icons";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  hint?: string;
}

export function EmptyState({ icon, message, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50 py-16">
      {icon || <FileText className="mb-4 h-12 w-12 text-zinc-700" />}
      <p className="text-lg font-medium text-zinc-500">{message}</p>
      {hint && <p className="mt-1 text-sm text-zinc-600">{hint}</p>}
    </div>
  );
}
