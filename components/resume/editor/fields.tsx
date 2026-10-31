"use client";

import type { ReactNode } from "react";
import { get, useFormContext, useFormState, type FieldPath } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { ResumeForm } from "@/lib/resume/form";

export type FormPath = FieldPath<ResumeForm>;

/** Stable DOM id for a form path (ids must be unique across repeated entries). */
export function fieldId(name: string) {
  return `field-${name.replace(/\./g, "-")}`;
}

export function useFieldError(name: FormPath): string | undefined {
  const { errors } = useFormState<ResumeForm>({ name });
  const error = get(errors, name) as { message?: string } | undefined;
  return error?.message;
}

type TextFieldProps = {
  name: FormPath;
  label: string;
  type?: "text" | "email" | "tel" | "url" | "month";
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
};

export function TextField({ name, label, type = "text", disabled, className, ...rest }: TextFieldProps) {
  const { register } = useFormContext<ResumeForm>();
  const error = useFieldError(name);
  return (
    <div className={className}>
      <Input
        id={fieldId(name)}
        label={label}
        type={type}
        error={error}
        {...rest}
        {...register(name)}
        // Plain HTML disabled only: RHF's own disabled option would clear the value.
        disabled={disabled}
      />
    </div>
  );
}

type TextAreaFieldProps = {
  name: FormPath;
  label: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  hint?: ReactNode;
  className?: string;
};

export function TextAreaField({ name, label, hint, rows = 3, className = "", ...rest }: TextAreaFieldProps) {
  const { register } = useFormContext<ResumeForm>();
  const error = useFieldError(name);
  const id = fieldId(name);
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`w-full rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground leading-relaxed placeholder:text-muted/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent resize-y ${error ? "border-danger focus:ring-danger/25 focus:border-danger" : "border-border hover:border-accent/40 dark:hover:border-accent/50"}`}
        {...rest}
        {...register(name)}
      />
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
