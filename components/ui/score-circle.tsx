"use client";

import { cn, scoreToVariant } from "@/lib/utils";

interface ScoreCircleProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function ScoreCircle({ score, label = "Overall", size = "lg" }: ScoreCircleProps) {
  const variant = scoreToVariant(score);
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (score / 100) * circumference;

  const sizeMap = {
    sm: "h-24 w-24",
    md: "h-32 w-32",
    lg: "h-40 w-40",
  };

  const textSizeMap = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const colorMap = {
    success: "stroke-green-500",
    warning: "stroke-amber-500",
    danger: "stroke-red-500",
  };

  return (
    <div className={cn("relative", sizeMap[size])}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-800" />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000", colorMap[variant])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold text-zinc-100", textSizeMap[size])}>{score}%</span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
    </div>
  );
}
