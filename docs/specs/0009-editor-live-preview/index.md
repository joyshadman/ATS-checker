# 0009. Editor live preview: the ATS sheet beside the form, following unsaved edits, with pickers that save at once

**Date**: 2026-10-31
**Status**: In Progress

## Summary

The resume editor (`/resumes/[id]/edit`) gets a live preview: the same A4 sheet the detail page shows (spec 0007), updating about 300 ms after you stop typing, including edits you have not saved yet. On screens 1280 px and wider the sheet sits in a sticky column to the right of the form; on narrower screens an Edit / Preview tab switch shows one at a time. A compact Template and Links picker sits above the sheet and saves at once, exactly like the detail page, without touching your sections, so it never causes an "Unsaved changes" label or a "changed elsewhere" conflict. No database change and no new server action; one existing loader returns two more fields.

## Requirements

**User stories**:
- As a job seeker editing my resume, I want to see the formatted sheet change as I type so that I know how my words will look to an employer before I save.
- As a job seeker on a laptop, I want the form and the sheet side by side so that I never have to switch views while writing.
- As a job seeker on a phone, I want to flip between editing and previewing so that both stay readable on a small screen.
- As a job seeker, I want to switch template and link style while editing so that I can see which one fits my content without leaving the editor.

**Acceptance criteria**:
- **AC-1**: On `/resumes/[id]/edit` at a viewport width of 1280 px or more (Tailwind `xl`), the page shows two columns: the editor form on the left and a "Preview" column on the right. The preview column is sticky under the editor's save bar, as tall as the remaining viewport, and scrolls on its own, so the form and the sheet scroll independently. The sheet scales down to the column width as a whole (spec 0007 AC-10 behavior); there is no horizontal scroll.
- **AC-2**: Below 1280 px, the save bar carries an **Edit / Preview** switch (a two tab tablist), default **Edit**. Edit shows the form only; Preview shows the preview column only (pickers, warning, sheet). Switching never loses unsaved form values or field errors, and returning to Edit restores the page scroll position the form had. Save, the status label, the title field, and "View resume" stay in the bar on both tabs. Pressing Save on the Preview tab while the form has errors switches to Edit and focuses the first invalid field. The switch is not shown at 1280 px and up. The chosen tab is not remembered across page loads.
- **AC-3**: When the editor opens, the sheet shows the saved content at once (no blank first frame). After that it shows the form's current values, saved or not, about 300 ms after the last change (a trailing debounce, plus measuring time on long resumes) (typing, adding, removing, or reordering an entry, removing an optional section, accepting an AI suggestion into a field). The resume title is not on the sheet (it never was). Sections follow spec 0007 AC-2 (fixed order, empty sections hidden).
- **AC-4**: When the form values pass the resume content schema, the preview sheet is identical to what the detail page shows for the same content once saved. When they do not pass (a half typed link, an end date before the start date, a field over its length limit), the sheet still renders what was typed, as is, after the same trimming and blank dropping the schema applies; it never blanks, freezes on an old version, or shows an error. The form's own field errors remain the only error signal. Invalid input differs from what Save would store only while it is invalid (for example, blank bullets are hidden on the sheet but would fail validation on Save).
- **AC-5**: Above the sheet, a compact **Template** row shows Classic, Modern, and Compact as a segmented radio group with the saved one selected; each option's one line description is available as a tooltip and to screen readers. Choosing one updates the sheet at once and saves it to `Resume.templateId` through `setResumeAppearance`. If the save fails, the selection and sheet go back to the last saved value and a toast says "Could not save the template. Try again."; when several picks are made quickly, a late answer for an older pick never overrides a newer one (spec 0007 AC-11, same behavior).
- **AC-6**: Below it, a compact **Links** row offers Visible URL, Label only, and Label and URL the same way (tooltips carry the spec 0007 AC-4 tradeoff lines), saving to `Resume.linkStyle`, with the failure toast "Could not save the link style. Try again." and the same ordering rule.
- **AC-7**: A template or link style save from the editor never changes `content`, `contentText`, `contentUpdatedAt`, or `improvedContent` (spec 0007 AC-5). It does not mark the form dirty, does not change the "Unsaved changes" / "Saved" label, and a later Save of sections succeeds without a "changed elsewhere" conflict. Opening the detail page afterwards shows the new template and link style.
- **AC-8**: When the preview sheet runs past 2 pages, the preview column shows the warning "Your resume runs past 2 pages. Most recruiters expect 1 to 2." above the sheet (same wording and style as the detail page), and it disappears as soon as the content fits in 2 pages again.
- **AC-9**: The editor preview does not highlight placeholders, does not offer a Download PDF button, does not render a print copy, and does not show the AI improvement draft sheet. Printing the editor page is not a supported way to get a PDF.
- **AC-10**: After Save succeeds and after "Reload" on a conflict, the sheet shows the adopted values immediately, skipping the debounce. After an AI suggestion or any other change to the form, it follows within the debounce. The sheet always reflects the form, never a separate copy of the saved document. Reload refreshes content only; a template or link style changed in another tab shows after the next page load.
- **AC-11**: When the editor opens, the pickers and sheet start from the resume's saved `templateId` and `linkStyle` (a missing or unknown stored value resolves to Classic and Visible URL, as on the detail page).
- **AC-12**: The template and link pickers work while a section save or an AI request is running. The pick shows at once; its save may complete only after the running request finishes (server actions from one page run one after another), and AC-5's revert and toast still apply if it fails.
- **AC-13**: Keyboard and screen reader: the Edit / Preview switch is a `tablist` with arrow key movement; each picker row is a `radiogroup` with arrow key movement and selection (the spec 0007 `ChoiceGroup` behavior); the preview column is a labelled region named "Resume preview". The sheet's text stays real, selectable text.
- **AC-14**: In dark mode the sheet stays white paper with dark ink (spec 0007 AC-9); only the column around it follows the theme. The sheet uses the same template fonts as the detail page.
- **AC-15**: In the editor preview, a link is clickable (opens in a new tab) only when its URL parses as an `http:` or `https:` address. Any other URL (half typed, relative, blank, `javascript:`) shows as typed text with no link, so clicking the sheet can never navigate away from the editor.
- **AC-16**: If the preview fails to render, the preview column shows "The preview could not be shown. Your edits are safe; keep editing or save." and the form keeps working. The preview tries again on the next change.

## Decision

**Chosen option**: Option 1: Client side preview fed by the editor's own form state

The editor renders the existing `ResumeSheet` from debounced React Hook Form values (schema parsed when valid, leniently mapped when not), in a sticky right column at `xl` and behind an Edit / Preview switch below it, with compact pickers that reuse the detail page's optimistic save hook and `setResumeAppearance`.

## Feature design

**Data model sketch**: no schema change. Reads the existing `Resume.templateId` and `Resume.linkStyle` (spec 0007) and writes them through the existing `setResumeAppearance`.

**State** (client only):
- In a new child component `<EditorPreview>` (`components/resume/editor/editor-preview.tsx`), so keystroke re renders stay out of `ResumeEditor` and its sections:
  - `watched`: `useWatch({ control })` on the whole form.
  - `debounced`: `watched` after a 300 ms trailing debounce, seeded with the initial form values so the first render is immediate (AC-3), then passed through `useDeferredValue` so typing is never blocked by measuring.
  - `previewContent`: `useMemo` on `debounced`: `parseResumeContent(toContent(values))` inside `try`; on a throw, `toPreviewContent(values)` (AC-4).
  - `pageCount`: `useState` setter passed straight to `onPageCount` (stable, no wrapper).
- In `ResumeEditor`: `templateId`, `linkStyle` from `useSavedChoice` (seeded from the loader, read once); `mobileTab`: `"edit" | "preview"`, default `"edit"`, not persisted; `previewFlush`: a counter bumped inside `adopt()` that `<EditorPreview>` watches to skip the debounce after Save and Reload (AC-10).

**Layout and wiring**:
- The `<form>` element stays the outer wrapper (as today). At `xl` the area below the save bar becomes a grid: `xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-8`, inside a container widened at `xl` (for example `xl:max-w-[88rem]`), with the save bar's inner `max-w-4xl` widened to match. The left column holds the banners, target role box, and fieldset; the right column holds `<EditorPreview>`. The pickers are plain `type="button"` controls, never registered form fields, so they cannot dirty the form (AC-7).
- Save bar: at `xl` it stays one row (the title input shrinks; nothing wraps). Its rendered height is measured with a `ResizeObserver` into a CSS variable `--editor-bar-h` on the form wrapper. The preview column uses `position: sticky; top: calc(3.5rem + var(--editor-bar-h)); max-height: calc(100dvh - 3.5rem - var(--editor-bar-h)); overflow-y: auto; scrollbar-gutter: stable` (3.5rem is the dashboard header, `h-14`). No ancestor of the column may set `overflow`, or sticky stops working.
- Mounting: a small `useMediaQuery("(min-width: 1280px)")` hook (`matchMedia`, false on the server) decides mounting. At `xl` the preview is always mounted. Below `xl` it is mounted only while the Preview tab is active, so it never measures inside a hidden box. Visibility of the form uses CSS (`hidden xl:block` on the Preview tab); the form itself is never unmounted.
- Tabs: the tablist sits in the save bar below `xl` (`xl:hidden`), each tab's `aria-controls` points at the form column id or the preview column id. Switching to Preview stores `window.scrollY`; switching back restores it after the form is shown again (AC-2). `handleSubmit(onValid, onInvalid)` gets an `onInvalid` that sets the tab to Edit before React Hook Form focuses the field (AC-2).
- Fonts and fallbacks: `<EditorPreview>` wraps its content in `sheetFontVariables` (AC-14) and in a small error boundary showing the AC-16 message, reset by the next `previewContent`.
- Shared pieces: move `useSavedChoice`, `ChoiceGroup`, and `SheetArea` out of `resume-viewer.tsx` into `components/resume/viewer/choices.tsx`. `ChoiceGroup` gains `variant: "cards" | "compact"`; `compact` renders a segmented row of names, with each description in an `sr-only` span referenced by `aria-describedby` plus a `title` tooltip for mouse users. The detail page keeps `variant="cards"`. While a pick's save is pending, its row shows a quiet "Saving..." note (the hook's `pending`), so a pick queued behind an AI request is visibly not yet saved (AC-12).
- Links: `SheetLink` gains a `safeHref` option; the editor preview sets it, and then a URL that does not parse with `new URL()` to `http:` or `https:` renders as a plain `<span>` with the same text (AC-15). The detail page is unchanged (its content already passed the schema's URL check).

**API surface** (server actions):
| Action | Change | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `getResumeContent(id)` | add two fields | `id` | adds `templateId: TemplateId` = `resolveTemplateId(resume.templateId, id)` and `linkStyle: LinkStyle` = `resolveLinkStyle(resume.linkStyle, id)`, from the row it already loads | owner (`loadResumeWithAuth`) | unchanged |
| `setResumeAppearance({ resumeId, templateId?, linkStyle? })` | none, reused | as today | as today | owner | as spec 0007 AC-12 |

**Value sourcing**:
| Action / view | Value produced / displayed | Source |
|---|---|---|
| Editor page load | initial template | `getResumeContent` → `resolveTemplateId(Resume.templateId)` (new field) |
| Editor page load | initial link style | `getResumeContent` → `resolveLinkStyle(Resume.linkStyle)` (new field) |
| Preview sheet | resume content shown | form values via `useWatch` in `<EditorPreview>`, debounced 300 ms; `parseResumeContent(toContent(values))` when it does not throw, else `toPreviewContent(values)` |
| Preview sheet | whether a link is clickable | `new URL(link.url).protocol` is `http:` or `https:` (AC-15) |
| Preview column | sticky top and max height | 3.5rem header plus `--editor-bar-h`, measured from the save bar |
| Preview sheet | template and link style | the `useSavedChoice` shown values (optimistic picks) |
| Preview sheet | dates, link text | existing `formatRange` / `linkText` in `lib/resume/format.ts` (already tolerate unparseable input by showing it as typed) |
| Over 2 pages warning | page count | `ResumeSheet` `onPageCount` |
| Picker tooltips | option descriptions | `TEMPLATES[].description`, `LINK_STYLES[].tradeoff` in `lib/resume/templates.ts` |
| Layout switch | side by side vs tabs | CSS `xl` breakpoint (1280 px) for what is visible; `useMediaQuery("(min-width: 1280px)")` for whether the preview is mounted |

**`toPreviewContent(form): ResumeContent`** (new, in `lib/resume/form.ts`, next to `toContent`): the same mapping as `toContent` (including `dated` and `splitSkills`), then:
- Trim every string but **keep every key**: a blank value stays `""`, never `undefined`. (The schema's own `normalize` drops blank keys, which would leave `link.url` or an entry name undefined and crash `linkText` / `displayUrl`; the templates already treat `""` as empty, since they check optional fields by truthiness.)
- Drop blank bullets, blank skill items, and links whose label and URL are both blank.
- Drop entries that do not count by the existing `entryCounts` rule in the same file (any non blank text field or bullet, ignoring `id` and `current`).
- Cut every string to 2,000 characters, so a huge paste cannot stall layout. The schema's own limits are lower, so valid content is never cut.
- Keep invalid URLs and dates as typed. It never throws. It is used only for the preview, never for saving.

**Key invariants**:
- The preview never writes anything except through the pickers, and the pickers write only `templateId` / `linkStyle`.
- The preview always derives from the live form state; there is no second copy of the content that could drift from the form.
- A valid form previews exactly like the saved detail page sheet (same parse path, same `ResumeSheet`).
- The form stays mounted on both mobile tabs (hidden with CSS), so React Hook Form state, field arrays, and focus targets survive the switch. The preview is never mounted inside a hidden box, so its page measuring and scale are always real.
- A preview render error never reaches the form (error boundary).

**Security model**: no new surface. `getResumeContent` and `setResumeAppearance` are already owner only through `loadResumeWithAuth`; the new fields come from the same loaded row. Preview content is never sent to the server.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path desktop: at 1440 px, type a new bullet, the sheet shows it within about 300 ms with "Unsaved changes" in the bar; Save; the detail page shows the same sheet, verifies **AC-1**, **AC-3**, **AC-4**.
- Phone: at 375 px, edit a field, tap Preview, the sheet shows the edit; tap Edit, the field still has the text and the form is at the same scroll position, verifies **AC-2**.
- Invalid input: type `linkedin.com/in/ja` into a link URL and set an end date before the start; the sheet shows both as typed, the form shows its field errors, verifies **AC-4**.
- Picker without conflict: change the template in the editor with unsaved edits pending; the label stays "Unsaved changes"; Save succeeds with no conflict; the detail page shows the new template; `contentUpdatedAt` unchanged in Prisma Studio, verifies **AC-5**, **AC-7**.
- Picker failure: go offline, pick Modern; it reverts to the saved template with the toast, verifies **AC-5**, **AC-6**.
- Busy server: start an AI section write, pick Compact during it; the sheet switches at once and the save lands after the AI finishes, verifies **AC-12**.
- Long resume: add entries until page 3 appears; the warning shows; remove one, it disappears, verifies **AC-8**.
- Reload on conflict: edit the resume in a second tab and save; in the first, Save, then Reload; the sheet shows the reloaded content at once, verifies **AC-10**.
- Crash guards: add a link with a label and no URL, and a project with a URL but no name; the sheet renders, nothing crashes, verifies **AC-4**, **AC-16**.
- Unsafe links: type `javascript:alert(1)` and `/resumes` as link URLs; both show as text, neither is clickable, verifies **AC-15**.
- Phone errors: on the Preview tab, clear a required field's value through Edit, switch to Preview, press Save; the editor switches to Edit and focuses the field, verifies **AC-2**.
- Resize: on a 1440 px window with unsaved edits, shrink below 1280 px and back; the sheet's pages and scale are correct each time, verifies **AC-1**, **AC-2**.
- Slow device: with the CPU slowed 6x in dev tools, typing on a 2 page resume never drops keystrokes, verifies **AC-3**.

## Build plan

Tracer Bullet: a thin thread from the loader through the editor to a rendered sheet first, then thicken.

1. Add `templateId` and `linkStyle` to `getResumeContent` and pass them from `app/(dashboard)/resumes/[id]/edit/page.tsx` into `ResumeEditor` as `initialTemplateId` / `initialLinkStyle`, satisfies **AC-11**
2. Thin thread: add `<EditorPreview>` (watch, 300 ms debounce seeded with the initial values, `useDeferredValue`, `parseResumeContent` path, `previewFlush` from `adopt()`), wrapped in `sheetFontVariables` and an error boundary, rendering `ResumeSheet` (`highlight={false}`, not printable). Lay it out in the `xl` grid with the widened container and save bar, the measured `--editor-bar-h`, and the sticky, independently scrolling column, satisfies **AC-1**, **AC-3**, **AC-10**, **AC-14**, **AC-16**
3. Add `toPreviewContent` in `lib/resume/form.ts` (keeps keys, `entryCounts`, 2,000 character cap) as the fallback, and the `safeHref` option on `SheetLink`, satisfies **AC-4**, **AC-15**
4. Move `useSavedChoice`, `ChoiceGroup`, and `SheetArea` into `components/resume/viewer/choices.tsx` (detail page unchanged in behavior), add the `compact` variant with `aria-describedby` descriptions and the pending note, and wire the Template and Links rows in the preview through `setResumeAppearance`, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-11**, **AC-12**, **AC-13**
5. Below `xl`: `useMediaQuery`, the Edit / Preview tablist in the save bar, CSS hiding of the form, scroll save and restore, and `onInvalid` switching to Edit, satisfies **AC-2**, **AC-13**
6. Over 2 pages warning through the shared `SheetArea`, and confirm the exclusions (no highlight, no PDF button, no print copy, no draft sheet), satisfies **AC-8**, **AC-9**
7. Light, dark, phone (375 px), tablet (1024 px), and desktop (1280 px and 1440 px) checks of the editor, plus the 6x CPU slowdown typing check, satisfies **AC-1** to **AC-16**

## Consequences

**Positive**:
- You see the real employer view while writing, which was the gap spec 0007 deferred.
- Reuses `ResumeSheet`, the template registry, `setResumeAppearance`, and the optimistic save hook; no new server surface, no migration.
- The picker save model is the same on both pages, so there is one rule to learn and one hook to maintain.

**Negative / tradeoffs**:
- The sheet measures and paginates on every debounced change; on a long resume and a slow phone this costs a few frames per pause in typing. The 300 ms debounce and unmounting the preview on the mobile Edit tab bound it, but it is real work the editor did not do before.
- Two content paths now exist for display: the strict `parseResumeContent` and the lenient `toPreviewContent`. The lenient one deliberately differs from the schema's `normalize` (it keeps blank keys), so if the content shape changes later, `toPreviewContent` must change with it. If this drift proves costly, the fallback is to freeze the preview on the last valid content instead (Option considered and declined in this spec).
- At about 460 px per column, the sheet shows at about 55% scale, so body text is small (around 6 to 7 px). That is enough to judge layout and length, not to proofread; the full size sheet stays on the detail page.
- Template and link changes save immediately while sections save on Save. That split is deliberate (it avoids conflicts) but you may expect one Save to cover everything.
- The editor page gets wider at `xl`, so its layout no longer matches the `max-w-4xl` other forms use.

**Neutral**:
- `useSavedChoice`, `ChoiceGroup`, and `SheetArea` move to `choices.tsx`; the detail page imports them from there.
- The detail page keeps reading its appearance fields through `getResume` as today; only the editor uses the new `getResumeContent` fields.
- `getResumeContent` returns two more fields; its other callers ignore them.

## Follow-up

- [ ] Consider a "Hide preview" toggle at `xl` if people ask for the full width form back (not in this spec).
- [ ] Consider placeholder highlighting in the editor preview if the post Save placeholder banner proves too easy to miss (left out by choice, AC-9).
- [ ] The detail page's "Consider showing the template picker in the editor" follow up in spec 0007 is covered here; tick it when this feature ships.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
