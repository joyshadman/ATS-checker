"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { MAX_BULLETS } from "@/lib/resume/content";
import { aiUnavailableReason, buildAiTarget, newItem, type ResumeForm } from "@/lib/resume/form";
import { AiButton } from "./ai-button";
import { useCloseOnRemove } from "./ai-writing";
import { fieldId, useFieldError } from "./fields";
import { AddButton, ItemControls } from "./item-controls";
import { SuggestionPanel } from "./suggestion-panel";

type BulletSection = "experience" | "education" | "projects";

function BulletRow({
  name,
  index,
  count,
  onMove,
  onRemove,
}: {
  name: `${BulletSection}.${number}.bullets.${number}.value`;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const { register } = useFormContext<ResumeForm>();
  const error = useFieldError(name);
  const id = fieldId(name);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <li className="space-y-1">
      <div className="flex items-start gap-2">
        <span className="mt-3 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
        <label htmlFor={id} className="sr-only">
          Bullet {index + 1}
        </label>
        <input
          id={id}
          type="text"
          maxLength={500}
          placeholder="Led the move to … and cut … by 30%"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`flex-1 min-w-0 rounded-xl border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent ${error ? "border-danger focus:ring-danger/25 focus:border-danger" : "border-border hover:border-accent/40"}`}
          {...register(name)}
        />
        <ItemControls
          itemLabel={`bullet ${index + 1}`}
          index={index}
          count={count}
          onMove={onMove}
          onRemove={onRemove}
          size="sm"
        />
      </div>
      {error && (
        <p id={errorId} className="pl-3.5 text-xs text-danger">
          {error}
        </p>
      )}
    </li>
  );
}

/** Achievement bullets inside one experience, education, or project entry. */
export function BulletList({ section, index }: { section: BulletSection; index: number }) {
  const { control, getValues } = useFormContext<ResumeForm>();
  const name = `${section}.${index}.bullets` as const;
  const { fields, append, remove, move } = useFieldArray({ control, name, keyName: "key" });

  // AI bullets (spec 0003): keyed by the entry's own id, so moving keeps the panel.
  const entryId = useWatch({ control, name: `${section}.${index}.id` });
  useWatch({ control, name: `${section}.${index}` }); // re-render on entry edits for the precondition
  const aiKey = `bullets:${entryId}`;
  useCloseOnRemove(aiKey, `section-${section}-heading`);
  const target = { kind: "bullets", section, index } as const;
  const reason = aiUnavailableReason(getValues(), target);
  const hasBullets = fields.length > 0;
  const buildTarget = () => buildAiTarget(getValues(), target);

  return (
    <fieldset className="space-y-2">
      <legend className="float-left text-sm font-medium text-foreground mt-1.5">Bullets</legend>
      <div className="flex justify-end">
        <AiButton
          aiKey={aiKey}
          label={hasBullets ? "Rewrite bullets with AI" : "Write bullets with AI"}
          reason={reason}
          buildTarget={buildTarget}
        />
      </div>
      <div className="clear-both" />
      {fields.length > 0 && (
        <ul className="space-y-2">
          {fields.map((field, i) => (
            <BulletRow
              key={field.key}
              name={`${name}.${i}.value`}
              index={i}
              count={fields.length}
              onMove={move}
              onRemove={() => remove(i)}
            />
          ))}
        </ul>
      )}
      <AddButton
        label="Add bullet"
        count={fields.length}
        max={MAX_BULLETS}
        noun="bullets per entry"
        onClick={() => append(newItem.bullet(), { focusName: `${name}.${fields.length}.value` })}
      />
      <SuggestionPanel aiKey={aiKey} buildTarget={buildTarget} />
    </fieldset>
  );
}
