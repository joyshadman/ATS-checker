import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResumeContent } from "@/actions/resume";
import {
  RESUME_NOT_FOUND,
  RESUME_UNAUTHORIZED,
  SECTIONS_UNREADABLE,
} from "@/lib/resume/content";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, FileText } from "@/components/ui/icons";
import { ResumeEditor } from "@/components/resume/editor/resume-editor";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const result = await getResumeContent(id);
  if (!result.success) return { title: "Edit Resume" };
  return { title: `Edit ${result.data.title}` };
}

function Notice({
  id,
  icon,
  title,
  message,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="max-w-2xl mx-auto py-8 animate-slide-up">
      <Card>
        <CardContent className="flex flex-col items-center text-center gap-4 py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-border/60">
            {icon}
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted max-w-md">{message}</p>
          </div>
          <Link
            href={`/resumes/${id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-cream shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Back to resume
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function EditResumePage({ params }: Params) {
  const { id } = await params;
  const result = await getResumeContent(id);

  if (!result.success) {
    if (result.error === RESUME_NOT_FOUND || result.error === RESUME_UNAUTHORIZED) notFound();
    return (
      <Notice
        id={id}
        icon={<AlertCircle className="h-7 w-7 text-danger" aria-hidden="true" />}
        title={result.error === SECTIONS_UNREADABLE ? SECTIONS_UNREADABLE : "This resume could not be opened"}
        message={
          result.error === SECTIONS_UNREADABLE
            ? "The saved sections are damaged, so the editor cannot open them. Nothing was changed."
            : result.error
        }
      />
    );
  }

  const { title, content, contentUpdatedAt, hasDraft } = result.data;

  if (!content || !contentUpdatedAt) {
    return (
      <Notice
        id={id}
        icon={<FileText className="h-7 w-7 text-accent" aria-hidden="true" />}
        title={title}
        message="This resume was uploaded as a file. Opening it in the editor comes with import."
      />
    );
  }

  return (
    <ResumeEditor
      key={id}
      resumeId={id}
      initialTitle={title}
      initialContent={content}
      initialUpdatedAt={contentUpdatedAt.toISOString()}
      initialHasDraft={hasDraft}
    />
  );
}
