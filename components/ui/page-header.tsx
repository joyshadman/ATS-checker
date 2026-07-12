import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function PageHeader({ icon, title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-300">
          {icon}
        </div>
        {title}
      </h1>
      <p className="mt-2 text-zinc-400">{description}</p>
    </div>
  );
}
