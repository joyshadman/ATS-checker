import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "gradient" | "flat";
  hover?: boolean;
};

const variantStyles = {
  default: "bg-card border shadow-card",
  gradient: "bg-gradient-card border shadow-card",
  flat: "bg-surface border-0",
};

export function Card({
  variant = "default",
  hover = false,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${variantStyles[variant]} ${hover ? "hover:shadow-card-hover hover:-translate-y-0.5" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 pt-6 pb-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-6 pb-6 pt-0 flex items-center gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
