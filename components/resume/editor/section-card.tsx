import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** One editor section: heading, short guidance, optional header action, body. */
export function SectionCard({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-32">
      <Card>
        <CardHeader className="flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} tabIndex={-1} className="text-lg font-semibold text-foreground flex items-center gap-2.5 focus:outline-none">
              <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" aria-hidden="true" />
              {title}
            </h2>
            <p className="text-sm text-muted mt-1">{description}</p>
          </div>
          {action}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </section>
  );
}

/** One entry inside a list section (a job, a school, a skill group…). */
export function EntryCard({
  heading,
  controls,
  children,
}: {
  heading: string;
  controls: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="rounded-xl border border-border/70 bg-surface/40 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground truncate min-w-0">{heading}</h3>
        {controls}
      </div>
      {children}
    </li>
  );
}
