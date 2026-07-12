"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/ui/icons";

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: ReactNode;
  label: string;
  loadingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
}

export function ActionButton({
  onClick,
  disabled,
  loading,
  icon,
  label,
  loadingLabel,
  variant = "primary",
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel || "Processing..."}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </Button>
  );
}
