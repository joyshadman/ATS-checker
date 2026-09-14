import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function PageHeader({ icon, title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-border/60 text-accent">
          {icon}
        </div>
        {title}
      </h1>
      <p className="mt-2 text-muted">{description}</p>
    </div>
  );
}
