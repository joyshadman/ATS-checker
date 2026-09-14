import type { ReactNode } from "react";

type Variant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

type Props = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

const styles: Record<Variant, string> = {
  default:
    "bg-surface text-muted border",
  primary:
    "bg-accent/10 text-accent border-accent/20",
  success:
    "bg-success/10 text-success border-success/20",
  warning:
    "bg-warning/10 text-warning border-warning/20",
  danger:
    "bg-danger/10 text-danger border-danger/20",
  info:
    "bg-accent/10 text-accent border-accent/20",
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
