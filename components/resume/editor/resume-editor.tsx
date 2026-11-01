"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { getResumeContent, saveResumeContent, setResumeAppearance } from "@/actions/resume";
import {
  parseResumeContent,
  RESUME_CONFLICT,
  titleSchema,
  type ResumeContent,
} from "@/lib/resume/content";
import {
  OPTIONAL_SECTIONS,
  resumeFormResolver,
  toContent,
  toForm,
  type OptionalSection,
  type ResumeForm,
} from "@/lib/resume/form";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSavedChoice } from "@/components/resume/viewer/choices";
import type { LinkStyle, TemplateId } from "@/lib/resume/templates";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorBanner } from "@/components/ui/error-banner";
import { AlertCircle } from "@/components/ui/icons";
import { countPlaceholders } from "@/lib/resume/placeholders";
import type { AiBalanceView } from "@/lib/ai/credits-shared";
import { AiWritingProvider, useAiWriting } from "./ai-writing";
import { fieldId } from "./fields";
import { TargetRoleBox } from "./target-role-box";
import { ImportNotice } from "./import-notice";
import { EditorPreview } from "./editor-preview";
import type { ImportNotice as ImportNoticeData } from "@/lib/resume/import";
import {
  CertificationsSection,
  ContactSection,
  EducationSection,
  ExperienceSection,
  LanguagesSection,
  ProjectsSection,
  SkillsSection,
  SummarySection,
} from "./sections";

type Props = {
  resumeId: string;
  initialTitle: string;
  initialContent: ResumeContent;
  /** Resume.contentUpdatedAt as an ISO string. */
  initialUpdatedAt: string;
  initialHasDraft: boolean;
  /** AI uses left (spec 0004); null when the balance could not be loaded. */
  initialBalance: AiBalanceView | null;
  /** Set on copies made by import until dismissed (spec 0006). */
  initialImportNotice?: ImportNoticeData | null;
  importedFrom?: { id: string; title: string } | null;
  /** The saved look the live preview starts from (spec 0009, AC-11). */
  initialTemplateId: TemplateId;
  initialLinkStyle: LinkStyle;
};

type SaveState = "idle" | "saving" | "saved" | "conflict";
type EditorTab = "edit" | "preview";

/** Side by side form and preview from here up (spec 0009, AC-1); tabs below. */
const WIDE_QUERY = "(min-width: 1280px)";

const TITLE_PREFIX = "title: ";
const NETWORK_ERROR = "Could not reach the server. Your edits are still here, try again.";

const OPTIONAL_LABELS: Record<OptionalSection, string> = {
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
};

/** Save is also disabled while an AI request runs: server actions from one page run one after another (spec 0003). */
function SaveButton({ saving, isDirty }: { saving: boolean; isDirty: boolean }) {
  const { busy } = useAiWriting();
  return (
    <Button type="submit" loading={saving} disabled={!isDirty || saving || busy} title={busy ? "Wait for the AI to finish" : undefined}>
      {saving ? "Saving..." : "Save"}
    </Button>
  );
}

function visibleFrom(content: ResumeContent): Set<OptionalSection> {
  return new Set(OPTIONAL_SECTIONS.filter((key) => content[key].length > 0));
}

/** True when the stored document is what this form would save (normalized). */
function matchesStored(values: ResumeForm, stored: { title: string; content: ResumeContent | null }) {
  if (!stored.content) return false;
  try {
    return (
      titleSchema.parse(values.title) === stored.title &&
      JSON.stringify(parseResumeContent(toContent(values))) === JSON.stringify(stored.content)
    );
  } catch {
    return false;
  }
}

export function ResumeEditor({
  resumeId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
  initialHasDraft,
  initialBalance,
  initialImportNotice = null,
  importedFrom = null,
  initialTemplateId,
  initialLinkStyle,
}: Props) {
  const form = useForm<ResumeForm>({
    defaultValues: toForm(initialTitle, initialContent),
    resolver: resumeFormResolver,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const { register, handleSubmit, reset, setValue, getValues, formState } = form;
  const { isDirty, errors } = formState;

  // The version this editor last loaded or saved (seeded once, never re-read from props).
  const [version, setVersion] = useState(initialUpdatedAt);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [draftConfirmed, setDraftConfirmed] = useState(false);
  const [confirmDraftOpen, setConfirmDraftOpen] = useState(false);
  const [visible, setVisible] = useState<Set<OptionalSection>>(() => visibleFrom(initialContent));
  const [removeTarget, setRemoveTarget] = useState<OptionalSection | null>(null);
  // Placeholders left after the last successful save (spec 0003, AC-12).
  const [placeholders, setPlaceholders] = useState(0);

  // Live preview (spec 0009). The look saves on its own and never touches content (AC-7),
  // so it lives here rather than in the form.
  const [templateId, chooseTemplate, savingTemplate] = useSavedChoice<TemplateId>(
    initialTemplateId,
    async (value) => (await setResumeAppearance({ resumeId, templateId: value })).success,
    "Could not save the template. Try again."
  );
  const [linkStyle, chooseLinkStyle, savingLinkStyle] = useSavedChoice<LinkStyle>(
    initialLinkStyle,
    async (value) => (await setResumeAppearance({ resumeId, linkStyle: value })).success,
    "Could not save the link style. Try again."
  );
  const [previewFlush, setPreviewFlush] = useState(0);
  const isWide = useMediaQuery(WIDE_QUERY);
  const [tab, setTab] = useState<EditorTab>("edit");
  const formScroll = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const saving = saveState === "saving";
  useUnsavedChanges(isDirty && !saving);

  // The sticky preview column sits under the save bar, whose height varies (AC-1).
  useEffect(() => {
    const bar = barRef.current;
    const form = formRef.current;
    if (!bar || !form) return;
    const update = () => form.style.setProperty("--editor-bar-h", `${bar.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  // Back on Edit, the form returns to where it was (AC-2).
  useLayoutEffect(() => {
    if (tab === "edit" && formScroll.current !== null) {
      window.scrollTo(0, formScroll.current);
      formScroll.current = null;
    }
  }, [tab]);

  function switchTab(next: EditorTab) {
    if (next === tab) return;
    if (next === "preview") {
      formScroll.current = window.scrollY;
      setTab(next);
      window.scrollTo(0, 0);
    } else {
      setTab(next);
    }
  }

  function onTabKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: EditorTab = tab === "edit" ? "preview" : "edit";
    switchTab(next);
    document.getElementById(`editor-tab-${next}`)?.focus();
  }

  function adopt(title: string, content: ResumeContent, updatedAt: Date | string, draft: boolean) {
    setVersion(new Date(updatedAt).toISOString());
    reset(toForm(title, content));
    setHasDraft(draft);
    setPreviewFlush((n) => n + 1);
  }

  async function save(values: ResumeForm) {
    if (saving) return;
    setSaveState("saving");
    setServerError(null);

    let result: Awaited<ReturnType<typeof saveResumeContent>>;
    try {
      result = await saveResumeContent(resumeId, {
        title: values.title,
        content: toContent(values),
        expectedUpdatedAt: version,
      });
    } catch {
      setServerError(NETWORK_ERROR);
      setSaveState("idle");
      return;
    }

    if (result.success) {
      setPlaceholders(countPlaceholders(result.data.content));
      adopt(result.data.title, result.data.content, result.data.contentUpdatedAt, false);
      setDraftConfirmed(true);
      setSaveState("saved");
      return;
    }

    if (result.error === RESUME_CONFLICT) {
      // The previous save may have landed with its response lost: if the stored
      // document is exactly this form, it is saved, not a conflict.
      const latest = await getResumeContent(resumeId).catch(() => null);
      if (latest?.success && matchesStored(values, latest.data) && latest.data.contentUpdatedAt) {
        setPlaceholders(countPlaceholders(latest.data.content!));
        adopt(latest.data.title, latest.data.content!, latest.data.contentUpdatedAt, latest.data.hasDraft);
        setSaveState("saved");
        return;
      }
      setSaveState("conflict");
      return;
    }

    if (result.error.startsWith(TITLE_PREFIX)) {
      form.setError("title", { type: "server", message: result.error.slice(TITLE_PREFIX.length) }, { shouldFocus: true });
    } else {
      setServerError(result.error);
    }
    setSaveState("idle");
  }

  const onValid = (values: ResumeForm) => {
    if (saving) return;
    if (hasDraft && !draftConfirmed) {
      setConfirmDraftOpen(true);
      return;
    }
    void save(values);
  };

  // React Hook Form focuses the first invalid field right after this, so the form
  // must be visible first (AC-2).
  const onInvalid = () => {
    if (tab === "edit") return;
    formScroll.current = null;
    flushSync(() => setTab("edit"));
  };

  async function reloadLatest() {
    setServerError(null);
    const latest = await getResumeContent(resumeId).catch(() => null);
    if (!latest?.success || !latest.data.content || !latest.data.contentUpdatedAt) {
      setServerError(latest && !latest.success ? latest.error : NETWORK_ERROR);
      return;
    }
    adopt(latest.data.title, latest.data.content, latest.data.contentUpdatedAt, latest.data.hasDraft);
    setVisible(visibleFrom(latest.data.content));
    setDraftConfirmed(false);
    setSaveState("idle");
  }

  function showSection(key: OptionalSection) {
    setVisible((prev) => new Set(prev).add(key));
    requestAnimationFrame(() => {
      const el = document.getElementById(`section-${key}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus({ preventScroll: true });
    });
  }

  function hideSection(key: OptionalSection) {
    if (getValues(key).length > 0) {
      setValue(key, [], { shouldDirty: true });
    }
    setVisible((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function requestRemoveSection(key: OptionalSection) {
    if (getValues(key).length > 0) setRemoveTarget(key);
    else hideSection(key);
  }

  const removeAction = (key: OptionalSection) => (
    <Button type="button" variant="ghost" size="sm" onClick={() => requestRemoveSection(key)}>
      Remove section
    </Button>
  );

  const statusLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "conflict"
        ? "Changed elsewhere"
        : isDirty
          ? "Unsaved changes"
          : saveState === "saved"
            ? "Saved"
            : "";

  const hidden = OPTIONAL_SECTIONS.filter((key) => !visible.has(key));
  const title = { id: fieldId("title"), error: errors.title?.message };
  const rootError = errors.root?.message;

  return (
    <FormProvider {...form}>
      <AiWritingProvider resumeId={resumeId} initialBalance={initialBalance}>
      <form
        ref={formRef}
        onSubmit={(event) => handleSubmit(onValid, onInvalid)(event)}
        noValidate
        className="max-w-4xl xl:max-w-[88rem] mx-auto space-y-6"
      >
        {/* Sticky bar: title, status, save, and the Edit / Preview switch below xl */}
        <div
          ref={barRef}
          className="sticky top-14 z-10 -mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 py-3 border-b border-border/60 bg-background/85 backdrop-blur-xl"
        >
          <div className="max-w-4xl xl:max-w-[88rem] mx-auto flex flex-wrap xl:flex-nowrap items-center gap-x-4 gap-y-2">
            <div className="flex-1 min-w-[12rem]">
              <label htmlFor={title.id} className="sr-only">
                Resume title
              </label>
              <input
                id={title.id}
                type="text"
                maxLength={200}
                disabled={saving}
                aria-invalid={title.error ? true : undefined}
                aria-describedby={title.error ? `${title.id}-error` : undefined}
                className={`w-full rounded-xl border bg-transparent px-3 py-1.5 text-xl font-bold tracking-tight text-foreground placeholder:text-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent ${title.error ? "border-danger" : "border-transparent hover:border-border"}`}
                placeholder="Resume title"
                {...register("title")}
              />
              {title.error && (
                <p id={`${title.id}-error`} className="px-3 text-xs text-danger">
                  {title.error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span
                role="status"
                aria-live="polite"
                className={`text-xs font-medium ${saveState === "conflict" ? "text-danger" : isDirty ? "text-warning" : "text-muted"}`}
              >
                {statusLabel}
              </span>
              <Link
                href={`/resumes/${resumeId}`}
                className="text-sm font-medium text-muted hover:text-foreground rounded-lg px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                View resume
              </Link>
              <SaveButton saving={saving} isDirty={isDirty} />
            </div>
            <div
              role="tablist"
              aria-label="Editor view"
              className="w-full xl:hidden grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-surface/60 p-1"
            >
              {(["edit", "preview"] as const).map((key) => {
                const selected = tab === key;
                return (
                  <button
                    key={key}
                    id={`editor-tab-${key}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={key === "edit" ? "editor-form-column" : "editor-preview-column"}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => switchTab(key)}
                    onKeyDown={onTabKeyDown}
                    className={`rounded-lg py-1.5 min-h-9 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      selected ? "bg-card text-foreground shadow-sm" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {key === "edit" ? "Edit" : "Preview"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-8 xl:items-start">
        <div
          id="editor-form-column"
          role={isWide ? undefined : "tabpanel"}
          aria-labelledby={isWide ? undefined : "editor-tab-edit"}
          className={`space-y-6 min-w-0 ${tab === "preview" ? "hidden xl:block" : ""}`}
        >
        {/* Banners */}
        {hasDraft && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/10 p-4 text-sm text-warning">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="flex-1">
              An AI improvement is waiting. Saving discards it.{" "}
              <Link href={`/resumes/${resumeId}`} className="font-semibold underline underline-offset-2">
                Review it first
              </Link>
            </p>
          </div>
        )}

        {saveState === "conflict" && (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1">
              {RESUME_CONFLICT} Reloading replaces your unsaved edits here, so copy anything you want to keep first.
            </p>
            <Button type="button" variant="danger" size="sm" onClick={reloadLatest}>
              Reload
            </Button>
          </div>
        )}

        {serverError && (
          <div role="alert">
            <ErrorBanner message={serverError} onDismiss={() => setServerError(null)} />
          </div>
        )}
        {rootError && (
          <div role="alert">
            <ErrorBanner message={rootError} />
          </div>
        )}

        {placeholders > 0 && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/10 p-4 text-sm text-warning"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="flex-1">
              {placeholders === 1 ? "1 placeholder" : `${placeholders} placeholders`} still to fill, like [X%]. Replace
              them with your real numbers before you send this resume.
            </p>
            <button
              type="button"
              onClick={() => setPlaceholders(0)}
              aria-label="Dismiss placeholder warning"
              className="ml-auto rounded-lg px-1.5 text-warning/70 hover:text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              &times;
            </button>
          </div>
        )}

        {initialImportNotice && (
          <ImportNotice resumeId={resumeId} notice={initialImportNotice} importedFrom={importedFrom} />
        )}

        <TargetRoleBox />

        {/* Sections */}
        <fieldset disabled={saving} className="space-y-6 min-w-0">
          <legend className="sr-only">Resume sections</legend>
          <ContactSection />
          <SummarySection />
          <ExperienceSection />
          <EducationSection />
          <SkillsSection />
          {visible.has("projects") && <ProjectsSection action={removeAction("projects")} />}
          {visible.has("certifications") && <CertificationsSection action={removeAction("certifications")} />}
          {visible.has("languages") && <LanguagesSection action={removeAction("languages")} />}

          {hidden.length > 0 && (
            <div className="rounded-2xl border-2 border-dashed border-border/60 bg-surface/30 p-5">
              <h2 className="text-sm font-semibold text-foreground">Add section</h2>
              <p className="text-xs text-muted mt-0.5">Optional sections show up on your resume only when they have entries.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {hidden.map((key) => (
                  <Button key={key} type="button" variant="secondary" size="sm" onClick={() => showSection(key)}>
                    + {OPTIONAL_LABELS[key]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </fieldset>
        </div>

        {/* Live preview (spec 0009): sticky under the save bar at xl, the Preview tab below */}
        <section
          id="editor-preview-column"
          aria-label="Resume preview"
          role={isWide ? undefined : "tabpanel"}
          className={`min-w-0 ${tab === "edit" ? "hidden xl:block" : ""} xl:sticky xl:top-[calc(3.5rem+var(--editor-bar-h,4rem)+1.5rem)] xl:max-h-[calc(100dvh-3.5rem-var(--editor-bar-h,4rem)-3rem)] xl:overflow-y-auto xl:[scrollbar-gutter:stable] xl:pr-1`}
        >
          {(isWide || tab === "preview") && (
            <EditorPreview
              template={{ value: templateId, choose: chooseTemplate, pending: savingTemplate }}
              linkStyle={{ value: linkStyle, choose: chooseLinkStyle, pending: savingLinkStyle }}
              flush={previewFlush}
            />
          )}
        </section>
        </div>
      </form>

      <Dialog
        open={confirmDraftOpen}
        onClose={() => setConfirmDraftOpen(false)}
        title="Discard the AI improvement?"
        description="Saving your edits throws away the AI improvement draft that is waiting for this resume."
      >
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmDraftOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              setConfirmDraftOpen(false);
              setDraftConfirmed(true);
              void save(getValues());
            }}
          >
            Save and discard draft
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title={`Remove ${removeTarget ? OPTIONAL_LABELS[removeTarget] : "section"}?`}
        description="Its entries are cleared from the form. Nothing changes on your saved resume until you press Save."
      >
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setRemoveTarget(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (removeTarget) hideSection(removeTarget);
              setRemoveTarget(null);
            }}
          >
            Remove section
          </Button>
        </div>
      </Dialog>
      </AiWritingProvider>
    </FormProvider>
  );
}
