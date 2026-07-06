type Props = {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeStyles = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

function getColor(value: number, max: number): string {
  const pct = (value / max) * 100;
  if (pct >= 80) return "bg-gradient-success";
  if (pct >= 60) return "bg-gradient-primary";
  if (pct >= 40) return "bg-gradient-warning";
  return "bg-gradient-error";
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = true,
  size = "md",
  className = "",
}: Props) {
  const pct = Math.min(Math.max(value, 0), max);
  const ratio = (pct / max) * 100;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium text-foreground">{label}</span>}
          {showValue && (
            <span className="font-semibold text-muted">
              {Math.round(ratio)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full rounded-full bg-surface border overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getColor(pct, max)}`}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}
