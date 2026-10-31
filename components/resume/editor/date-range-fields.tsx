"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { ResumeForm } from "@/lib/resume/form";
import { fieldId, TextField } from "./fields";

type DatedSection = "experience" | "education" | "projects";

/**
 * Start, End, and Current for one entry (spec 0002, AC-6). Checking Current clears End
 * and disables it with the plain HTML attribute; toContent drops End when current.
 */
export function DateRangeFields({
  section,
  index,
  currentLabel = "I currently work here",
}: {
  section: DatedSection;
  index: number;
  currentLabel?: string;
}) {
  const { register, setValue, control } = useFormContext<ResumeForm>();
  const base = `${section}.${index}` as const;
  const current = useWatch({ control, name: `${base}.current` });
  const currentId = fieldId(`${base}.current`);
  const currentField = register(`${base}.current`);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
      <TextField name={`${base}.start`} label="Start" type="month" placeholder="YYYY-MM" />
      <TextField
        name={`${base}.end`}
        label="End"
        type="month"
        placeholder={current ? "Present" : "YYYY-MM"}
        disabled={current}
      />
      <div className="flex items-center gap-2.5 sm:pt-9 min-h-11">
        <input
          id={currentId}
          type="checkbox"
          className="h-5 w-5 rounded border-border accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          {...currentField}
          onChange={(e) => {
            void currentField.onChange(e);
            if (e.target.checked) {
              setValue(`${base}.end`, "", { shouldDirty: true, shouldValidate: true });
            }
          }}
        />
        <label htmlFor={currentId} className="text-sm text-foreground">
          {currentLabel}
        </label>
      </div>
    </div>
  );
}
