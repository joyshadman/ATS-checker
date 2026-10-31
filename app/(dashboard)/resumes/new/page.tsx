import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Upload } from "@/components/ui/icons";
import { NewResumeForm } from "@/components/forms/new-resume-form";

export const metadata: Metadata = {
  title: "Resume Maker",
  description: "Build a new resume section by section.",
};

const SECTIONS = [
  { name: "Contact", hint: "Name, email, phone, location, and links" },
  { name: "Summary", hint: "Two or three lines on who you are" },
  { name: "Experience", hint: "Roles, dates, and achievement bullets" },
  { name: "Education", hint: "Schools, degrees, and dates" },
  { name: "Skills", hint: "Grouped lists like Languages or Tools" },
  { name: "Optional", hint: "Projects, certifications, and languages" },
];

export default function NewResumePage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="animate-slide-up">
        <PageHeader
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
          title="Resume Maker"
          description="Build a clean, ATS friendly resume one section at a time. Save whenever you like and come back later."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 animate-slide-up stagger-1">
          <CardHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-gradient-accent inline-block" aria-hidden="true" />
              Start a new resume
            </h2>
            <p className="text-sm text-muted mt-1">
              We fill in your name and email from your account. Everything else is up to you.
            </p>
          </CardHeader>
          <CardContent>
            <NewResumeForm />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card variant="gradient" className="animate-slide-up stagger-2">
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">What you will fill in</h2>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {SECTIONS.map((section, i) => (
                  <li key={section.name} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-cream text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-medium text-foreground block">{section.name}</span>
                      <span className="text-muted">{section.hint}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card variant="flat" className="animate-slide-up stagger-3">
            <CardContent className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-muted">
                Already have a resume file?{" "}
                <Link href="/dashboard" className="font-medium text-accent hover:underline">
                  Upload it from the dashboard
                </Link>{" "}
                to analyze it as is.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
