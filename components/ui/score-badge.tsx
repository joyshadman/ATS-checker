import { cn, scoreToVariant } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, label, size = "sm" }: ScoreBadgeProps) {
  const variant = scoreToVariant(score);
  const displayLabel = label || scoreToVariantLabel(variant);

  const colorMap = {
    success: "border-green-500/20 bg-green-500/10 text-green-400",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    danger: "border-red-500/20 bg-red-500/10 text-red-400",
  };

  const sizeMap = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        colorMap[variant],
        sizeMap[size]
      )}
    >
      {score}%
      <span className="ml-1 opacity-70">{displayLabel}</span>
    </span>
  );
}

function scoreToVariantLabel(variant: "success" | "warning" | "danger"): string {
  if (variant === "success") return "Good";
  if (variant === "warning") return "Fair";
  return "Poor";
}
