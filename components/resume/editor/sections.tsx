"use client";

import type { ReactNode } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { MAX_ENTRIES, MAX_LINKS } from "@/lib/resume/content";
import { aiUnavailableReason, buildAiTarget, newItem, type ResumeForm } from "@/lib/resume/form";
import { AiButton } from "./ai-button";
import { BulletList } from "./bullet-list";
import { SuggestionPanel } from "./suggestion-panel";
import { DateRangeFields } from "./date-range-fields";
import { TextAreaField, TextField } from "./fields";
import { AddButton, ItemControls } from "./item-controls";
import { EntryCard, SectionCard } from "./section-card";

/** Header action for optional sections. */
export type RemoveSectionAction = ReactNode;

function EntryList({
  keys,
  headings,
  onMove,
  onRemove,
  render,
}: {
  keys: string[];
  headings: string[];
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  render: (index: number) => ReactNode;
}) {
  if (keys.length === 0) return null;
  return (
    <ol className="space-y-4">
      {keys.map((key, i) => (
        <EntryCard
          key={key}
          heading={headings[i]}
          controls={
            <ItemControls
              itemLabel={headings[i]}
              index={i}
              count={keys.length}
              onMove={onMove}
              onRemove={() => onRemove(i)}
            />
          }
        >
          {render(i)}
        </EntryCard>
      ))}
    </ol>
  );
}

const joinHeading = (parts: (string | undefined)[], fallback: string) =>
  parts.map((p) => p?.trim()).filter(Boolean).join(", ") || fallback;

// ───── Contact & summary ─────

export function ContactSection() {
  const { control } = useFormContext<ResumeForm>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "contact.links", keyName: "key" });
  const links = useWatch({ control, name: "contact.links" }) ?? [];

  return (
    <SectionCard id="section-contact" title="Contact" description="How recruiters reach you. Your name is required.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField name="contact.fullName" label="Full name" autoComplete="name" maxLength={120} />
        <TextField name="contact.email" label="Email" type="email" autoComplete="email" />
        <TextField name="contact.phone" label="Phone" type="tel" autoComplete="tel" maxLength={40} />
        <TextField name="contact.location" label="Location" placeholder="City, Country" maxLength={120} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground mb-1">Links</legend>
        <EntryList
          keys={fields.map((f) => f.key)}
          headings={fields.map((_, i) => links[i]?.label?.trim() || `Link ${i + 1}`)}
          onMove={move}
          onRemove={remove}
          render={(i) => (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TextField name={`contact.links.${i}.label`} label="Label" placeholder="LinkedIn" maxLength={40} />
              <TextField
                name={`contact.links.${i}.url`}
                label="URL"
                type="url"
                placeholder="https://"
                className="sm:col-span-2"
              />
            </div>
          )}
        />
        <AddButton
          label="Add link"
          count={fields.length}
          max={MAX_LINKS}
          noun="links"
          onClick={() => append(newItem.link(), { focusName: `contact.links.${fields.length}.label` })}
        />
      </fieldset>
    </SectionCard>
  );
}

export function SummarySection() {
  const { control, getValues } = useFormContext<ResumeForm>();
  useWatch({ control }); // the precondition looks at the whole resume
  const summary = getValues("summary");
  const buildTarget = () => buildAiTarget(getValues(), { kind: "summary" });

  return (
    <SectionCard
      id="section-summary"
      title="Summary"
      description="Two or three sentences on who you are and what you are aiming for."
      action={
        <AiButton
          aiKey="summary"
          label={summary.trim() ? "Rewrite with AI" : "Write with AI"}
          reason={aiUnavailableReason(getValues(), { kind: "summary" })}
          buildTarget={buildTarget}
        />
      }
    >
      <TextAreaField
        name="summary"
        label="Professional summary"
        rows={4}
        maxLength={3000}
        placeholder="Frontend engineer with 5 years building accessible React apps…"
      />
      <SuggestionPanel aiKey="summary" buildTarget={buildTarget} />
    </SectionCard>
  );
}

// ───── Experience, education, skills ─────

export function ExperienceSection() {
  const { control } = useFormContext<ResumeForm>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "experience", keyName: "key" });
  const items = useWatch({ control, name: "experience" }) ?? [];

  return (
    <SectionCard id="section-experience" title="Experience" description="Most recent first. Use bullets for results, not duties.">
      <EntryList
        keys={fields.map((f) => f.key)}
        headings={fields.map((_, i) => joinHeading([items[i]?.title, items[i]?.company], "New role"))}
        onMove={move}
        onRemove={remove}
        render={(i) => (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField name={`experience.${i}.title`} label="Job title" maxLength={200} />
              <TextField name={`experience.${i}.company`} label="Company" maxLength={200} />
              <TextField name={`experience.${i}.location`} label="Location" maxLength={120} />
            </div>
            <DateRangeFields section="experience" index={i} />
            <BulletList section="experience" index={i} />
          </>
        )}
      />
      <AddButton
        label="Add experience"
        count={fields.length}
        max={MAX_ENTRIES}
        noun="entries"
        onClick={() => append(newItem.experience(), { focusName: `experience.${fields.length}.title` })}
      />
    </SectionCard>
  );
}

export function EducationSection() {
  const { control } = useFormContext<ResumeForm>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "education", keyName: "key" });
  const items = useWatch({ control, name: "education" }) ?? [];

  return (
    <SectionCard id="section-education" title="Education" description="Degrees, schools, and anything worth a bullet.">
      <EntryList
        keys={fields.map((f) => f.key)}
        headings={fields.map((_, i) => joinHeading([items[i]?.degree, items[i]?.school], "New school"))}
        onMove={move}
        onRemove={remove}
        render={(i) => (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField name={`education.${i}.school`} label="School" maxLength={200} />
              <TextField name={`education.${i}.degree`} label="Degree" placeholder="BSc" maxLength={200} />
              <TextField name={`education.${i}.field`} label="Field of study" maxLength={200} />
              <TextField name={`education.${i}.location`} label="Location" maxLength={120} />
            </div>
            <DateRangeFields section="education" index={i} currentLabel="I study here now" />
            <BulletList section="education" index={i} />
          </>
        )}
      />
      <AddButton
        label="Add education"
        count={fields.length}
        max={MAX_ENTRIES}
        noun="entries"
        onClick={() => append(newItem.education(), { focusName: `education.${fields.length}.school` })}
      />
    </SectionCard>
  );
}

export function SkillsSection() {
  const { control, getValues } = useFormContext<ResumeForm>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "skills", keyName: "key" });
  const items = useWatch({ control, name: "skills" }) ?? [];
  useWatch({ control, name: ["experience", "projects"] }); // precondition for Suggest skills
  const buildTarget = () => buildAiTarget(getValues(), { kind: "skills" });

  return (
    <SectionCard
      id="section-skills"
      title="Skills"
      description="Group related skills, for example Languages, Frameworks, Tools."
      action={
        <AiButton
          aiKey="skills"
          label="Suggest skills"
          reason={aiUnavailableReason(getValues(), { kind: "skills" })}
          buildTarget={buildTarget}
        />
      }
    >
      <EntryList
        keys={fields.map((f) => f.key)}
        headings={fields.map((_, i) => items[i]?.category?.trim() || `Skill group ${i + 1}`)}
        onMove={move}
        onRemove={remove}
        render={(i) => (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TextField
              name={`skills.${i}.category`}
              label="Group name (optional)"
              placeholder="Frameworks"
              maxLength={60}
            />
            <div className="sm:col-span-2 space-y-1">
              <TextField name={`skills.${i}.itemsText`} label="Skills" placeholder="React, TypeScript, Node" />
              <p className="text-xs text-muted">Separate skills with commas.</p>
            </div>
          </div>
        )}
      />
      <AddButton
        label="Add skill group"
        count={fields.length}
        max={MAX_ENTRIES}
        noun="groups"
        onClick={() => append(newItem.skills(), { focusName: `skills.${fields.length}.itemsText` })}
      />
      <SuggestionPanel aiKey="skills" buildTarget={buildTarget} />
    </SectionCard>
  );
}

// ───── Optional sections ─────

export function ProjectsSection({ action }: { action: RemoveSectionAction }) {
  const { control } = useFormContext<ResumeForm>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "projects", keyName: "key" });
  const items = useWatch({ control, name: "projects" }) ?? [];

  return (
    <SectionCard
      id="section-projects"
      title="Projects"
      description="Side projects, open source, or notable work outside a job."
      action={action}
    >
      <EntryList
        keys={fields.map((f) => f.key)}
        headings={fields.map((_, i) => items[i]?.name?.trim() || "New project")}
        onMove={move}
        onRemove={remove}
        render={(i) => (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField name={`projects.${i}.name`} label="Project name" maxLength={200} />
              <TextField name={`projects.${i}.role`} label="Your role" maxLength={200} />
              <TextField
                name={`projects.${i}.url`}
                label="URL"
                type="url"
                placeholder="https://"
                className="sm:col-span-2"
              />
            </div>
            <DateRangeFields section="projects" index={i} currentLabel="Ongoing" />
            <BulletList section="projects" index={i} />
          </>
        )}
      />
      <AddButton
        label="Add project"
        count={fields.length}
        max={MAX_ENTRIES}
        noun="entries"
        onClick={() => append(newItem.projects(), { focusName: `projects.${fields.length}.name` })}
      />
    </SectionCard>
  );
}

export function CertificationsSection({ action }: { action: RemoveSectionAction }) {
  const { control } = useFormContext<ResumeForm>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "certifications", keyName: "key" });
  const items = useWatch({ control, name: "certifications" }) ?? [];

  return (
    <SectionCard
      id="section-certifications"
      title="Certifications"
      description="Certificates and licenses that matter for the role."
      action={action}
    >
      <EntryList
        keys={fields.map((f) => f.key)}
        headings={fields.map((_, i) => items[i]?.name?.trim() || "New certification")}
        onMove={move}
        onRemove={remove}
        render={(i) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField name={`certifications.${i}.name`} label="Name" maxLength={200} />
            <TextField name={`certifications.${i}.issuer`} label="Issuer" maxLength={200} />
            <TextField name={`certifications.${i}.date`} label="Date" type="month" placeholder="YYYY-MM" />
            <TextField name={`certifications.${i}.url`} label="URL" type="url" placeholder="https://" />
          </div>
        )}
      />
      <AddButton
        label="Add certification"
        count={fields.length}
        max={MAX_ENTRIES}
        noun="entries"
        onClick={() => append(newItem.certifications(), { focusName: `certifications.${fields.length}.name` })}
      />
    </SectionCard>
  );
}

export function LanguagesSection({ action }: { action: RemoveSectionAction }) {
  const { control } = useFormContext<ResumeForm>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "languages", keyName: "key" });
  const items = useWatch({ control, name: "languages" }) ?? [];

  return (
    <SectionCard
      id="section-languages"
      title="Languages"
      description="Spoken languages and how well you speak them."
      action={action}
    >
      <EntryList
        keys={fields.map((f) => f.key)}
        headings={fields.map((_, i) => items[i]?.language?.trim() || "New language")}
        onMove={move}
        onRemove={remove}
        render={(i) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField name={`languages.${i}.language`} label="Language" maxLength={60} />
            <TextField
              name={`languages.${i}.proficiency`}
              label="Proficiency"
              placeholder="Native, Fluent, B2…"
              maxLength={60}
            />
          </div>
        )}
      />
      <AddButton
        label="Add language"
        count={fields.length}
        max={MAX_ENTRIES}
        noun="entries"
        onClick={() => append(newItem.languages(), { focusName: `languages.${fields.length}.language` })}
      />
    </SectionCard>
  );
}
