# 0002. Resume maker: a section editor with explicit save and a version check

**Date**: 2026-10-30
**Status**: In Progress

## Summary

You can now create a resume from scratch and fill it in section by section (contact, summary, experience, education, skills, plus optional projects, certifications, languages), then save it and come back later. The editor lives inside the existing resumes area (`/resumes/new` and `/resumes/[id]/edit`), is one form that you save on purpose with a Save button, and refuses a save if the resume changed somewhere else since you opened it. It builds only on spec 0001 (no new tables), and it also finishes the pieces 0001 left to it: Accept and Discard for AI drafts, and an "out of date" mark on old analyses.

## Requirements

**User stories**:
- As a job seeker, I want to start a new resume with a title and fill each section by hand so that I own a clean, structured resume without uploading a file.
- As a job seeker, I want to add, remove, and reorder entries and bullets so that the most important work comes first.
- As a job seeker, I want my work saved only when I press Save, and a warning before I lose unsaved edits, so that I stay in control of what is stored.
- As a job seeker, I want to see which of my resumes I built and which I uploaded, and know when an old analysis no longer matches my edits.

**Acceptance criteria**:
- **AC-1**: The sidebar has a "Resume Maker" link to `/resumes/new`, and `/resumes` has a "New resume" button to the same page. Submitting a title (1 to 200 characters after trimming) calls `createResume` and redirects to `/resumes/[id]/edit`. An empty or too long title shows the error under the field and creates nothing.
- **AC-2**: The editor shows, in this order: a sticky top bar (title field, save status, Save button), then Contact, Summary, Experience, Education, Skills, then Projects, Certifications, Languages. The three optional sections show only when they have entries or the user added them this session through an "Add section" menu. The page works at phone width with no sideways scrolling.
- **AC-3**: In every list (experience, education, skills, projects, certifications, languages, contact links, and bullets inside experience, education, and projects) the user can add an item, remove it, and move it up or down. Move up is disabled on the first item and move down on the last. Add is disabled at the cap (30 entries, 12 bullets, 10 links) with a short note saying the limit. A new entry or link gets a fresh id from `crypto.randomUUID()`.
- **AC-4**: Save is disabled until the form differs from what was loaded or last saved. While saving, it is disabled and reads "Saving...". On success the status shows "Saved", the form becomes clean, its values are replaced with what the server stored (trimmed), and reloading the page shows exactly that title and content, in the same order.
- **AC-5**: Client validation uses the same rules as the server (`resumeContentSchema` plus the 1 to 200 title rule). A field shows its error after it loses focus. Pressing Save with any invalid field shows every error, moves focus to the first one, and sends nothing to the server. Skills typed as `React, TypeScript, , Node` save as `["React", "TypeScript", "Node"]`; a skill group with no items shows "Required" on its box.
- **AC-6**: Checking "Current" on a dated entry clears and disables its End field. Start, End, and certification Date use month inputs and save as `YYYY-MM`.
- **AC-7**: If the server rejects a save (validation, not found, network), the editor shows the message in an error banner, keeps every edit, and stays unsaved.
- **AC-8**: Every save sends the `contentUpdatedAt` the editor last loaded or saved. If the stored value differs, nothing is written and the editor shows "This resume changed elsewhere. Reload to get the latest." with a Reload button; the user's edits stay in the form until they reload.
- **AC-9**: With unsaved changes, closing or reloading the tab triggers the browser's leave prompt, and clicking any internal link (sidebar included) asks "You have unsaved changes. Leave without saving?"; Cancel stays on the page, OK follows the link. With no unsaved changes there is no prompt.
- **AC-10**: When the resume has an AI improvement draft, the editor shows a banner "An AI improvement is waiting. Saving discards it." with a link to `/resumes/[id]`. The first Save in that page visit asks for confirmation; Cancel sends nothing, confirming saves (the server clears the draft, as in spec 0001). Later saves in the same visit do not ask again.
- **AC-11**: "Remove section" on an optional section asks for confirmation when it has entries, then empties it and hides it. An optional section emptied by removing its entries one by one stays visible (empty) until the next page load.
- **AC-12**: `/resumes/[id]/edit` for an uploaded resume (`content` null) shows "This resume was uploaded as a file. Opening it in the editor comes with import." with a link back to `/resumes/[id]`, and no form. A resume whose `content` cannot be parsed shows "This resume's sections could not be read" and no form. An unknown id or another user's resume shows the not found page.
- **AC-13**: The `/resumes` list and the dashboard's recent resumes show a "Built" badge for resumes with sections and "Uploaded" for the rest; built rows in `/resumes` have an Edit link. The detail page of a built resume has an Edit button; an uploaded resume's detail page has none.
- **AC-14**: On the detail page of a resume with an improvement draft, the improved panel shows Accept and Discard. Accept calls `acceptImprovedContent`, Discard calls `discardImprovedContent`; on success the page refreshes and shows the new resume text (Accept) or no draft (Discard). On failure (for example "Resume changed, try again") a toast shows the message and nothing changes.
- **AC-15**: On the detail page, when the latest analysis's `sourceContentAt` differs from the resume's `contentUpdatedAt`, the analysis panel shows an "Out of date, run again" badge; the same rule applies to the latest interview panel. Uploaded resumes (both values null) never show it.
- **AC-16**: Saving, loading, and editing are owner only: `saveResumeContent` or the edit page with another user's resume id writes nothing and returns "Resume not found" or "Unauthorized" (the page shows not found).

## Decision

**Chosen option**: Option 1: One client form editor (React Hook Form with field arrays) inside `/resumes`, saved on purpose with a version checked write.

Add `/resumes/new` and `/resumes/[id]/edit`, edit the whole document in one React Hook Form validated by the existing Zod schema, save it with one `saveResumeContent` call that also writes the title and only succeeds if `contentUpdatedAt` still matches, and wire the detail page, list, dashboard, and sidebar to it.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

No schema change and no migration. This feature reads and writes columns spec 0001 added:

| Table.column | Used for |
|---|---|
| `Resume.title` | Set on create; now also written by save (same update as content) |
| `Resume.content`, `contentText`, `contentUpdatedAt` | Written together by save (unchanged rule from 0001) |
| `Resume.improvedContent` | Cleared by save (0001); its presence drives the draft banner and the Accept/Discard buttons |
| `Analysis.sourceContentAt`, `Interview.sourceContentAt` | Compared with `Resume.contentUpdatedAt` for the out of date badge |

"Built" means `Resume.contentUpdatedAt` is not null (it is set whenever `content` is, per 0001). Which optional sections are visible is page state only, never stored.

**Form shape** (client only, `lib/resume/form.ts`, no `"use server"`): React Hook Form's `useFieldArray` needs arrays of objects, and skills are typed as one text box, so the form is a thin mapping of `ResumeContent`:

| `ResumeContent` | `ResumeForm` |
|---|---|
| (not in content) | `title: string` |
| `bullets: string[]` | `bullets: { value: string }[]` |
| `skills[].items: string[]` | `skills[].itemsText: string` (items joined with `", "`) |
| `start`, `end`, `date`, optional strings absent | `""` (inputs are always controlled) |
| everything else | same keys and values |

- `ResumeForm` has no `schemaVersion`; `toContent` always sets `schemaVersion: 1` (`CURRENT_SCHEMA_VERSION`).
- `toForm(title, content): ResumeForm` and `toContent(form): unknown` (split `itemsText` on commas, trim, drop empty pieces; unwrap bullets; leave blanks for the schema's normalization to drop; when `current` is true send `end` as absent).
- `titleSchema` (new, exported from `lib/resume/content.ts`): `z.string().trim().min(1, "Title is required").max(200)`. The single title rule, used by `createResume`, `saveResumeContent`, `NewResumeForm`, and the resolver. `createResumeSchema` in `actions/resume.ts` becomes `z.object({ title: titleSchema })`.
- `resumeFormResolver`: a custom React Hook Form resolver that runs `titleSchema` on `title` and `resumeContentSchema.safeParse(toContent(form))`, returning **all** issues as a nested RHF errors object (built with React Hook Form's `set(errors, path, { type: issue.code, message })`) and `values: {}` on failure. Path mapping: `…bullets.N` → `…bullets.N.value`; `skills.N.items` and `skills.N.items.M` → `skills.N.itemsText` (the message names the item, e.g. `Item 3: Too long`); every other path unchanged. Issues on a whole list (over 30 entries, over 10 links) or on a path with no field (for example a duplicate id) go to `root` and show in the error banner.
- `mode: "onBlur"`, `reValidateMode: "onChange"`, `shouldFocusError: true`.

**Editor details** (settled so the build does not invent them):
- **New item defaults**: appended at the end of its list; strings `""`, `current: false`, `bullets: []`, a new skill group `{ category: "", itemsText: "" }`, a new link `{ label: "", url: "" }`; every new entry and link gets `id: crypto.randomUUID()`; focus moves to the new item's first field. A half filled entry blocks Save until it is completed or removed (intended).
- **Current checkbox**: on check, `setValue("<entry>.end", "", { shouldDirty: true })`; the End input uses the plain HTML `disabled` attribute while `current` is true (never React Hook Form's `disabled` option, which sets the value to undefined).
- **Save handler**: returns early if already saving (guards Enter key and double click as well as the disabled button). While saving, the form's `<fieldset>` is disabled so nothing typed can be lost by the reset that follows.
- **Status labels**: clean and never saved this visit → none; dirty → "Unsaved changes"; saving → "Saving..."; just saved → "Saved" (until the next edit, then "Unsaved changes"); conflict → "Changed elsewhere".
- **Version in state**: the editor keeps `contentUpdatedAt` in its own state as an ISO string (seeded from the page once, never re-read from props), sends it as `expectedUpdatedAt`, and replaces it with `toISOString()` of the returned date after each save. The server does `new Date(expectedUpdatedAt)`; Postgres `timestamp(3)` and JavaScript dates both hold milliseconds, so equality is exact.
- **Conflict handling**: on the conflict message, the editor refetches with `getResumeContent`. If the stored content and title equal `toContent(form)` after normalization (the previous save landed but its response was lost), treat it as saved: adopt the fetched `contentUpdatedAt` and reset. Otherwise show the conflict banner. Its Reload button refetches with `getResumeContent` and calls `reset(toForm(title, content))`, replacing the user's edits (the banner says so); no full page reload, so the leave guard does not fire.
- **Optional sections**: a `visibleSections` set in page state, seeded with the optional sections that have entries at load. "Add section" lists only optional sections not in the set and adds one. "Remove section" (confirm `Dialog` if it has entries) does `setValue(section, [], { shouldDirty: true })` and deletes it from the set. Removing entries one by one never touches the set.
- **Leave guard scope**: armed only while `isDirty` and not saving; ignores links whose target is the current URL or only a `#hash`; removes both listeners on unmount. Programmatic navigation (`router.push`) is not guarded and the editor never triggers it while dirty.

**State transitions** (the editor page, per visit):
- `clean` → `dirty`: any edit (React Hook Form `isDirty`).
- `dirty` → `saving`: Save pressed, client validation passes (and the draft confirm accepted, when a draft exists and has not been confirmed this visit).
- `saving` → `clean`: server ok; form reset to the returned content and title; stored `contentUpdatedAt` replaced with the returned one; `hasDraft` becomes false.
- `saving` → `dirty` + error banner: server error (AC-7).
- `saving` → `conflict`: server returns the conflict message; Save stays available but the banner offers Reload (a retry will fail again until reload).

The improve draft lifecycle itself is unchanged from spec 0001.

**API surface** (server actions, all through `withAction`, all authenticated, all owner checked with `loadResumeWithAuth`):

| Action | File | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `createResume` (changed: title now trimmed via `titleSchema`) | `actions/resume.ts` | `title: string` (req) | `{ id }` | owner (session) | `title: <message>` |
| `saveResumeContent` (changed) | `actions/resume.ts` | `id: string` (req), `input: { title?: string, content: unknown, expectedUpdatedAt: string }` (content req, `expectedUpdatedAt` req ISO string) | `{ title, content: ResumeContent, contentUpdatedAt: Date }` | owner | `<path>: <message>`; "Resume not found"; "Unauthorized"; "This resume changed elsewhere. Reload to get the latest." |
| `getResumeContent` (changed) | `actions/resume.ts` | `id: string` (req) | `{ title, content, contentUpdatedAt, improvedContent, hasDraft }`; `hasDraft` is `resume.improvedContent !== null`, so a draft that fails to parse still counts | owner | "This resume's sections could not be read"; not found |
| `getResume` (unchanged) | `actions/resume.ts` | `id` | already returns `contentUpdatedAt`, `improvedContentText`, latest analysis and interview rows (with `sourceContentAt`) | owner | not found |
| `acceptImprovedContent`, `discardImprovedContent` (unchanged, first UI caller) | `actions/improve.ts` | `resumeId` | as in 0001 | owner | "No improvement draft to apply"; "Resume changed, try again" |

Error messages the UI matches on are exported as constants from `lib/resume/content.ts` (`RESUME_NOT_FOUND`, `RESUME_UNAUTHORIZED`, `SECTIONS_UNREADABLE`, `RESUME_CONFLICT`) and used by `loadResumeWithAuth`, `readResumeContent`, and `saveResumeContent`, so the edit page and editor compare against the constants, never retyped strings. The edit page maps not found and unauthorized to `notFound()`, unreadable to the corrupt state, anything else to a generic error state.

Title errors: client side, `titleSchema` shows the error under the field before any request. If the server still returns a message starting with `title: `, the form strips that prefix and shows it under the title field; every other server error goes to `ErrorBanner`. `NewResumeForm` is a plain `useState` form (title, `pending`, `error`) that disables its button while pending, then `router.push`es to the editor.

`saveResumeContent` rules: load with `loadResumeWithAuth`; parse content with `parseResumeContent`; if `title` is given, validate it with `titleSchema` (first issue as `title: <message>`); parse `expectedUpdatedAt` as a date (invalid → `expectedUpdatedAt: Invalid date`); then one `prisma.resume.updateMany({ where: { id, userId, contentUpdatedAt: expected }, data: { title?, content, contentText, contentUpdatedAt: new Date(), improvedContent: Prisma.DbNull } })`. Count 0 means the version moved (the row exists and is owned, checked above), so throw the conflict message. Keep the existing `revalidatePath` calls and add `revalidatePath(`/resumes/${id}/edit`)`, so a later visit never loads a cached older version (which would make every save conflict). A resume with `content` null is rejected with "This resume has no sections to save" (uploads are not editable until feature 6).

Pages and components (new unless marked):

| Path | Kind | Does |
|---|---|---|
| `app/(dashboard)/resumes/new/page.tsx` | server page | Heading plus `NewResumeForm` |
| `components/forms/new-resume-form.tsx` | client | Title field, calls `createResume`, `router.push(`/resumes/${id}/edit`)` |
| `app/(dashboard)/resumes/[id]/edit/page.tsx` | server page | `await params`; `getResumeContent(id)`; "Resume not found"/"Unauthorized" → `notFound()`; `content` null → upload notice; other error → error state; else renders `ResumeEditor`. `generateMetadata` title `Edit <title>` |
| `components/resume/editor/` | client | `resume-editor.tsx` (form, sticky bar, banners, Add section menu) plus one file per section kind and shared `move-buttons`, `bullet-list`, `date-range-fields` |
| `hooks/use-unsaved-changes.ts` | client hook | `useUnsavedChanges(dirty)`: `beforeunload` while dirty, and a capture phase `click` listener on `document` that, for a same origin `<a href>` without `target` or modifier keys, calls `window.confirm(...)` and on Cancel calls `preventDefault()` and `stopPropagation()` |
| `components/resume/improve-draft-actions.tsx` | client | Accept and Discard buttons, toast on error, `router.refresh()` on success |
| `components/ui/sidebar.tsx` (changed) | client | Add "Resume Maker" → `/resumes/new`; active link is the longest `href` that matches the path, so `/resumes/new` lights only Resume Maker |
| `app/(dashboard)/resumes/page.tsx`, `components/resume/resume-list.tsx` (changed) | | Select `contentUpdatedAt`; "New resume" button; Built/Uploaded badge; Edit link on built rows |
| `app/(dashboard)/dashboard/page.tsx` (changed) | | Select `contentUpdatedAt`; Built/Uploaded badge in recent resumes |
| `app/(dashboard)/resumes/[id]/page.tsx` (changed) | | Extend `ResumePageData` with `contentUpdatedAt` and the analysis and interview `sourceContentAt`; Edit button when built; `ImproveDraftActions` in the improved panel when `improvedContentText` is set; out of date badges; the header date reads "Created" for built resumes instead of "Uploaded" |
| `components/ui/sidebar.tsx` active rule | | Compute one active `href` for the whole list (the longest link `href` that equals the path or is a prefix followed by `/`, with `/dashboard` matching only exactly), not a per link `startsWith` |

Build every screen from existing primitives (`Card`, `Input`, `Button`, `Badge`, `Dialog`, `ErrorBanner`, toast) and theme tokens only (`context/ui-theme.md`, `context/ui-context.md`); no raw Tailwind colors. Use `Dialog` for the draft confirm and Remove section confirm; the leave guard must use `window.confirm` because it has to answer synchronously inside the click handler.

**Value sourcing**:

| Action / screen | Value produced or displayed | Source |
|---|---|---|
| New resume form | `title` | input |
| `createResume` | contact name and email seeds, ids, `contentUpdatedAt` | decided in spec 0001 |
| Edit page | initial title, content, `contentUpdatedAt`, has draft | `getResumeContent`: `title`, `content`, `contentUpdatedAt`, `hasDraft` |
| `toContent` | `schemaVersion` | constant `CURRENT_SCHEMA_VERSION` (1) |
| Title field | title rule | `titleSchema` in `lib/resume/content.ts` |
| Editor | status label | derived from editor state (mapping in *Editor details*) |
| Editor after conflict | whether the previous save actually landed | refetched `getResumeContent` content and title compared with `toContent(form)` |
| Detail page | header date label | "Created" when `contentUpdatedAt !== null`, else "Uploaded" |
| Editor | which optional sections show | derived: list non empty at load, or added this visit (page state) |
| Editor | new entry and link `id` | `crypto.randomUUID()` on add |
| Editor | skill `items` | derived from `itemsText` by `toContent` |
| Editor | `end` when Current is checked | absent (cleared by `toContent`) |
| Editor | field errors | `resumeFormResolver` (same Zod schema as the server) |
| Editor | whether Save is enabled | React Hook Form `isDirty` and not saving |
| Editor | "draft confirmed this visit" | page state, starts false, set true after a confirmed or successful save |
| `saveResumeContent` | `expectedUpdatedAt` | input: the `contentUpdatedAt` from load or the last successful save, sent as ISO string |
| `saveResumeContent` | stored `title` | input `title` (trimmed, validated) |
| `saveResumeContent` | `content`, `contentText`, new `contentUpdatedAt`, cleared draft | `parseResumeContent(input)`, `renderResumeText`, `new Date()`, `Prisma.DbNull` (0001 rules) |
| `saveResumeContent` | whether the write happened | `updateMany` count with `contentUpdatedAt: expected` in the filter |
| Editor after save | form values | returned `title` and `content` through `toForm` |
| List, dashboard | Built or Uploaded | `Resume.contentUpdatedAt !== null` |
| Detail page | Edit button shown | `contentUpdatedAt !== null` from `getResume` |
| Detail page | Accept/Discard shown | `improvedContentText !== null` from `getResume` |
| Detail page | analysis out of date | latest `Analysis.sourceContentAt` vs `Resume.contentUpdatedAt`, compared by `getTime()` with null equal to null |
| Detail page | interview out of date | same rule with the latest `Interview.sourceContentAt` |

**Key invariants**:
- The editor never writes `content` except through `saveResumeContent`, which writes title, `content`, `contentText`, `contentUpdatedAt`, and the cleared draft in one conditional update.
- A save never overwrites a version the editor did not load: the write filter includes `contentUpdatedAt: expected`.
- Client and server validation come from one schema (`lib/resume/content.ts`); the form never has its own copy of a rule. The only client side rule outside that file is the title rule, which mirrors `createResumeSchema`.
- Ids are generated once, on add, and never changed by reorder or edit.
- Moving items changes only array order; it never renames or regenerates ids.
- An uploaded resume (`content` null) is never given sections by this feature.
- No raw Tailwind color classes; theme tokens only.

**Security model**:
- Owner only. The edit page and every action load through `loadResumeWithAuth`; the page maps both "Resume not found" and "Unauthorized" to `notFound()` so it never reveals that another user's id exists.
- The conditional `updateMany` also filters by `userId`, so even a logic slip cannot write another user's row.
- No new data leaves the app: content goes to OpenRouter only through the existing AI actions (0001). The list and dashboard add only the `contentUpdatedAt` timestamp to their selects, never content.
- Links are limited to http and https by the schema, and the editor renders them only as input values, never as clickable links, so no script URL can run.
- No new compliance scope (same personal data uploads already carry).

**Configuration required**: none. No new env vars, credentials, or packages (React Hook Form and `@hookform/resolvers` are already installed).

**Critical test scenarios**:
- Happy path: from the sidebar, create "Frontend 2026", fill contact, summary, two experience entries with bullets, a skill group, save, leave, come back: identical content and order; analyze it from the detail page, verifies **AC-1**, **AC-2**, **AC-4**.
- Reorder: move the second experience entry up and a bullet down, save, reload: new order kept, ids unchanged in Prisma Studio, verifies **AC-3**, **AC-4**.
- Validation: blank company on a new entry shows "Required" on blur; Save with it sends no request (network tab) and focuses the field; skills `a, , b` saves as two items, verifies **AC-5**.
- Dates: check Current on an entry with an End date, End clears and disables, saved row has no `end`, verifies **AC-6**.
- Conflict: open the editor in two tabs, save in tab A, then save in tab B: tab B shows the reload message and the row still holds tab A's content, verifies **AC-8**.
- Server error: break the network (offline) and save: banner shows, edits stay, Save still enabled, verifies **AC-7**.
- Leave guard: edit, click the Dashboard sidebar link, Cancel stays with edits; reload the tab shows the browser prompt; with no edits neither prompts, verifies **AC-9**.
- Draft: run Improve on a built resume, open the editor: banner shows; Save asks to confirm; confirm saves and the detail page no longer shows a draft, verifies **AC-10**.
- Detail page: run Improve then Accept: resume text updates, draft gone; run Improve then Discard: draft gone; analyze, edit and save, the analysis shows "Out of date, run again", verifies **AC-14**, **AC-15**.
- Optional sections: add Projects, add then remove its only entry: section stays; reload: gone; Remove section with entries asks first, verifies **AC-11**.
- Upload and corrupt: open `/resumes/<upload id>/edit` (notice), corrupt `content` in Prisma Studio and open it (readable error), verifies **AC-12**.
- Lists: one built and one uploaded resume show the right badges in `/resumes` and the dashboard; only the built one has Edit, verifies **AC-13**.
- Auth/permission: as a second user, open the first user's `/resumes/<id>/edit` (not found) and call `saveResumeContent` with that id (error, row unchanged), verifies **AC-16**.

## Build plan

Tracer Bullet: tasks 1 to 3 are one thin thread through every layer (sidebar link, create page, edit page, the changed save action, database, and back) with only the title, contact, and summary editable. Tasks 4 to 8 thicken that same editor; tasks 9 and 10 connect it to the rest of the app. No schema change, so no `prisma db push`.

1. [x] Add `titleSchema` and the error message constants to `lib/resume/content.ts` and use them in `createResume`, `loadResumeWithAuth`, and `readResumeContent`. Change `saveResumeContent` to `(id, { title?, content, expectedUpdatedAt })` with the conditional `updateMany`, the conflict message, the `content` null rejection, the extra edit path revalidation, and the `{ title, content, contentUpdatedAt }` return; add `title` and `hasDraft` to `getResumeContent`, satisfies **AC-1**, **AC-4**, **AC-8**, **AC-16**.
2. [x] Add the "Resume Maker" sidebar link (longest match active rule), `app/(dashboard)/resumes/new/page.tsx`, and `NewResumeForm`, satisfies **AC-1**.
3. [x] Add `lib/resume/form.ts` (`ResumeForm`, `toForm`, `toContent`, `resumeFormResolver`), the edit page with its not found, upload notice, and corrupt states, and a first `ResumeEditor` with the sticky bar (title, status, Save), Contact (without links), and Summary, saving through task 1 and resetting to the returned values, satisfies **AC-2**, **AC-4**, **AC-5**, **AC-7**, **AC-8**, **AC-12**, **AC-16**.
4. [x] Add the list sections with `useFieldArray`: Experience, Education (with `date-range-fields` and the Current rule), Skills (`itemsText`), and contact links, each with add, remove, move up and down, caps, and the shared `bullet-list`, satisfies **AC-3**, **AC-5**, **AC-6**.
5. [x] Add Projects, Certifications, Languages behind the "Add section" menu, with Remove section and its confirm, satisfies **AC-2**, **AC-11**.
6. [x] Add `hooks/use-unsaved-changes.ts` and wire it to the editor's dirty state, satisfies **AC-9**.
7. [x] Add the draft banner and the first save confirm `Dialog`, satisfies **AC-10**.
8. Check the editor at phone width and keyboard only (move buttons have `aria-label`s like "Move Acme Corp up", errors are tied to fields with `aria-describedby`), satisfies **AC-2**, **AC-3**.
9. [x] Add `contentUpdatedAt` to the `/resumes` and dashboard selects; add the "New resume" button, Built/Uploaded badges, and Edit links, satisfies **AC-1**, **AC-13**.
10. [x] On the detail page add the Edit button for built resumes, `ImproveDraftActions` in the improved panel, and the out of date badges on the analysis and interview panels, satisfies **AC-13**, **AC-14**, **AC-15**.
11. Run `npm run lint` and `npm run build`, then walk the critical test scenarios in the real app with two accounts, satisfies **AC-1** to **AC-16**.

## Consequences

**Positive**:
- Users can build a resume with no file, and it immediately works with analysis, job match, improve, and interview prep (0001's shared text path).
- One schema validates both browser and server, so the editor cannot drift from what the server accepts.
- A stale tab or an accepted AI draft can no longer be silently overwritten.
- Saving on purpose keeps AI caches and improve drafts alive while the user types.
- Feature 3 (AI section writing) and feature 6 (import) plug into the same form: they only need to set field values in it.

**Negative / tradeoffs**:
- Edits are lost if the browser crashes before Save (no autosave or local backup).
- The leave guard does not cover the browser Back button or the sign out button (it is a button, not a link).
- The conflict path makes the user reload and retype their unsaved changes; there is no merge.
- The whole document is sent on every save (a few KB typically, about 600 KB worst case, under Next's default 1 MB server action body limit); fine at this scale, wasteful if documents grow.
- A large form with nested field arrays can re render slowly on low end phones; keep sections as separate components that subscribe only to their own fields.
- Older Safari shows month inputs as plain text boxes; users there type `YYYY-MM` and rely on the error message.
- `saveResumeContent`'s signature changes from spec 0001's; any caller added in between must update.
- A skill that itself contains a comma (for example "C, C++") is split into two items after save.
- A half filled entry blocks Save until it is completed or removed; there is no saving partial, invalid work.
- After a real conflict, Reload replaces the user's unsaved edits; they must copy anything they want to keep first.
- A draft that fails to parse still shows the editor banner, but the detail page cannot offer Accept or Discard for it; saving the resume clears it.

**Neutral**:
- React Hook Form moves from "installed but unused" to used in one place; the rest of the app keeps plain `FormData` forms.
- "Built" is inferred from `contentUpdatedAt`, not a stored type; after feature 6 imports an upload, that resume becomes "Built" too, which is the intended meaning.
- The list and dashboard now select `contentUpdatedAt` (a timestamp, never content), a narrow exception to spec 0001's "lists select only the old columns".

## Follow-up

- [ ] Feature 6 (import) replaces the upload notice on `/resumes/[id]/edit` and must create `content` on the upload row before opening the editor.
- [ ] Feature 3 (AI section writing) should set values into this form with `setValue` (so the result is unsaved until the user presses Save) rather than writing to the database directly.
- [ ] Feature 7 (PDF export) owns any styled preview; this editor has none.
- [ ] Spec 0001's follow up "no UI path to verify AC-1 to AC-4 and AC-9" is resolved by this feature; `/check verify` for 0001 can now run through the editor.
- [ ] `/sync` should note in `AGENTS.md` that React Hook Form is now used (resume editor only) and that `lib/resume/form.ts` is the only place form paths map to schema paths.
