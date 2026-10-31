# 0001. Store resume sections as a versioned JSON document on Resume

**Date**: 2026-10-30
**Status**: In Progress

## Summary

A resume can now hold typed sections (contact, summary, experience, education, skills, plus optional projects, certifications, languages) instead of only one block of uploaded text. The sections live in one new JSON column on the existing `Resume` table, checked by a versioned Zod schema (a typed rule set) on every save. Each save also writes a plain text copy, so analysis, job match, and interview prep keep working without knowing about sections. Old uploaded resumes are untouched; the editor, AI section writing, import, and PDF export (features 2 to 7) all build on this one shape.

## Requirements

**User stories**:
- As a job seeker, I want my resume stored as sections so that I can edit each part on its own and later export it cleanly.
- As a job seeker with uploaded resumes, I want everything I already have (analyses, interview questions, improvements) to keep working exactly as before.
- As a job seeker, I want an AI improvement of a sectioned resume to come back as a draft I can accept or throw away, so my own edits are never overwritten silently.

**Acceptance criteria**:
- **AC-1**: `createResume(title)` creates a resume owned by the signed in user with a v1 `content` document: `contact.fullName` and `contact.email` seeded from the user's account, every list empty, summary empty; `contentText` is rendered, `contentUpdatedAt` is set, `originalText` is null.
- **AC-2**: `saveResumeContent(id, content)` with a valid document replaces `content`, rewrites `contentText`, sets `contentUpdatedAt`, and clears `improvedContent`, all in one database write; loading it again returns the same document after normalization (trimmed strings, empty optional strings removed).
- **AC-3**: A save that breaks a rule (missing required field, a cap exceeded, duplicate ids, `current: true` with an end date, end before start, bad `YYYY-MM` format, a URL that is not http or https, unknown `schemaVersion`) is rejected with a single plain message for the first problem in the form `<path>: <message>` (for example `experience.0.title: Required`), and nothing is written.
- **AC-4**: `getResumeContent(id)` returns the parsed document (upgraded to the current version if older). If the stored JSON cannot be parsed, it returns the error "This resume's sections could not be read", logs the cause on the server, and never changes the stored data.
- **AC-5**: Resumes with `content` null (every existing upload) behave exactly as before in the list, detail page, analysis, job match, whole resume improve, and interview prep.
- **AC-6**: Analysis, job match, and interview prep read `getResumeText(resume)`; a resume built in the editor with no upload can be analyzed, matched, and used for interview questions once it has any summary or section entry. A resume whose content has no summary and no entries returns the existing "Resume has no text content" error.
- **AC-7**: A cached analysis or interview is reused only when its `sourceContentAt` equals the resume's current `contentUpdatedAt` (both null for upload only resumes). After a content save, the next run calls the AI again, including when an analysis started before the save and finished after it.
- **AC-8**: Improve on a resume with `content` asks the AI only for a rewritten summary and bullets keyed by entry id, merges them into a copy of `content` (rules in *Improve merge* below), stores the result in `improvedContent`, and leaves `content` unchanged. If a draft already exists, it is returned without a new AI call. If the resume was saved while the AI call was running, the draft is not stored and the user gets "Resume changed, try again".
- **AC-9**: `acceptImprovedContent(id)` parses the draft again, copies it into `content`, rewrites `contentText`, sets `contentUpdatedAt`, and clears the draft; it fails with "Resume changed, try again" if `content` changed since it was loaded. `discardImprovedContent(id)` clears only the draft. Either action with no draft returns "No improvement draft to apply" and changes nothing.
- **AC-10**: Every action here, plus the existing `getInterviews`, is owner only: another user's resume id returns the existing "Resume not found" or "Unauthorized" error and nothing is read or written.
- **AC-11**: When the AI call for improve fails, `content` and `improvedContent` stay as they were and the user gets the existing clear AI error message.
- **AC-12**: The resume detail page shows `contentText ?? originalText` as the resume text, and for a resume with a draft shows the rendered draft in the improved panel (it survives a refresh).

## Decision

**Chosen option**: Option 1: A nullable JSONB `content` column on `Resume`, validated by a versioned Zod schema, with a rendered `contentText` column for AI reads.

Add four nullable columns to `Resume` (`content`, `contentText`, `contentUpdatedAt`, `improvedContent`) and one nullable `sourceContentAt` column to `Analysis` and `Interview`; keep every existing column and relation as is.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

`Resume` (existing table, additive change, nothing removed or renamed):

| Column | Type | Null | Notes |
|---|---|---|---|
| `content` | `Json` (JSONB) | yes | The section document below. Null means upload only |
| `contentText` | `String` (text) | yes | Plain text rendering of `content`. Written on create, save, accept. Null when `content` is null |
| `contentUpdatedAt` | `DateTime` | yes | Set whenever `content` changes; acts as the content version |
| `improvedContent` | `Json` (JSONB) | yes | Improve draft, same schema as `content`. Cleared on save, accept, discard |

`Analysis` and `Interview` (existing tables): add `sourceContentAt DateTime?`, copied from `Resume.contentUpdatedAt` as read at the start of the action that created the row. Null for rows created before this change and for upload only resumes.

Unchanged: `originalText` (the upload record, never written by this feature), `improvedText`, `atsScore`, and the relations 1 Resume : N Analysis, 1 Resume : N Interview (both cascade on delete). No new index: nothing queries inside the JSON, and cache lookups already filter by `resumeId`.

`content` document, `schemaVersion: 1` (defined once in `lib/resume/content.ts`, TypeScript type inferred from the Zod schema):

| Key | Shape (required **bold**, every list defaults to `[]`) |
|---|---|
| `schemaVersion` | **literal `1`** |
| `contact` | {**fullName** 1..120, email (valid email), phone ≤40, location ≤120, links[] of {**id**, **label** ≤40, **url**} ≤10} |
| `summary` | string ≤3000, may be `""` |
| `experience[]` | {**id**, **title** ≤200, **company** ≤200, location ≤120, start, end, current, bullets[]} |
| `education[]` | {**id**, **school** ≤200, degree ≤200, field ≤200, location ≤120, start, end, current, bullets[]} |
| `skills[]` | {**id**, category ≤60 (`""` = ungrouped), **items[]** 1..50 strings ≤60} |
| `projects[]` | {**id**, **name** ≤200, role ≤200, url, start, end, current, bullets[]} |
| `certifications[]` | {**id**, **name** ≤200, issuer ≤200, date, url} |
| `languages[]` | {**id**, **language** ≤60, proficiency ≤60} |

Field rules:
- Normalization first: every string is trimmed; an optional string that ends up `""` is removed (stored as absent). This runs inside the Zod schema (`preprocess`), before validation, so a form can send empty inputs.
- `start`, `end`, `date` are optional strings matching `YYYY-MM`; `end` is nullable; `current` is a boolean defaulting to false.
- Every `url` is ≤500 chars and must parse as a URL with protocol `http:` or `https:`.
- `bullets` are strings 1..500 chars, at most 12 per entry; at most 30 entries in any list.
- `id` is a non empty string ≤64, unique across the whole document (entries and contact links).
- Required fields stay required even on a new blank entry; the editor (feature 2) shows the error.
- Worst case document size is about 600 KB (three bullet sections at the caps); typical resumes are a few KB.

Section order is fixed and is the order of the table above. An empty list means the section is not shown (editor may still offer it; renderer and PDF skip it).

**Improve merge** (pure function in `lib/resume/content.ts`):
- Request: the summary, then bullets of `experience`, then `projects`, each as `{ id, bullets }`, stopping at 40 bullets total. Entries past the limit are not sent and keep their text.
- Response: `{ summary?, entries: [{ id, bullets }], keyChanges }`.
- Each returned entry is checked on its own: unknown id, empty `bullets`, more than 12 bullets, or any bullet outside 1..500 chars → that entry's rewrite is dropped and the original stays. An invalid or empty `summary` keeps the original.
- Nothing else changes: no entries added or removed; ids, titles, dates, skills, contact copied as is. The merged copy is run through `parseResumeContent` before storing.

**State transitions** (the improve draft):
- no draft → draft: improve on a resume with `content` (stored only if `contentUpdatedAt` is unchanged since load)
- draft → no draft: accept (draft becomes `content`), discard, or any content save
- draft → draft: improve again returns the stored draft (no AI call)

**API surface** (server actions, all through `withAction`, all authenticated, all load the row with `loadResumeWithAuth`):

| Action | File | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|
| `createResume` | `actions/resume.ts` | `title: string` (req, 1..200) | `{ id }` | invalid title |
| `saveResumeContent` | `actions/resume.ts` | `id: string` (req), `content: unknown` (req, parsed server side) | `{ contentUpdatedAt }` | first Zod issue as `<path>: <message>`; not found; unauthorized |
| `getResumeContent` | `actions/resume.ts` | `id: string` (req) | `{ content: ResumeContent \| null, contentUpdatedAt, improvedContent: ResumeContent \| null }` | "This resume's sections could not be read"; not found |
| `getResume` (changed) | `actions/resume.ts` | unchanged | adds `contentText`, `contentUpdatedAt`, and `improvedContentText` (rendered draft or null); never the raw JSON | unchanged |
| `improveResume` (changed) | `actions/improve.ts` | `resumeId` | unchanged `ResumeImprovementResponse`; with `content`, `improvedResume` is the rendered draft text | AI errors (unchanged); cooldown; "Resume changed, try again" |
| `acceptImprovedContent` | `actions/improve.ts` | `resumeId` | `{ contentUpdatedAt }` | "No improvement draft to apply"; "Resume changed, try again" |
| `discardImprovedContent` | `actions/improve.ts` | `resumeId` | `void` | "No improvement draft to apply" |
| `analyzeResume`, `matchResumeToJob`, `generateInterviewQuestions` (changed) | `actions/analysis.ts`, `actions/interview.ts` | unchanged | unchanged | "Resume has no text content" when `getResumeText` is null |
| `getInterviews` (changed) | `actions/interview.ts` | unchanged | unchanged | adds the ownership check |

Every write action calls `revalidatePath("/resumes")` and `revalidatePath(`/resumes/${id}`)` (create also `/dashboard`, matching `uploadResume`).

Every Zod parse in these actions uses `safeParse` and throws `new Error(`${issue.path.join(".")}: ${issue.message}`)` for the first issue, because `withAction` returns `error.message` and a raw `ZodError` message is a JSON dump.

`improveResume` branch order: `content` set → structured path (`improvedText` ignored); else `originalText` set → existing text path unchanged; else "Resume has no text content". The structured path's `callAI` dedup key is `improve:${resumeId}:${contentUpdatedAt.getTime()}`, so the 30 second recent result cache (which also keeps failures) never replays a result for older content.

Library modules (new, no `"use server"`):
- `lib/resume/content.ts`: `resumeContentSchema`, `type ResumeContent`, `CURRENT_SCHEMA_VERSION`, `parseResumeContent(raw): ResumeContent` (validate, upgrade older versions, throw on failure), `emptyResumeContent(contact)`, `hasResumeBody(content)`, `mergeImprovement(content, response)`.
- `lib/resume/render.ts`: `renderResumeText(content): string`.
- `getResumeText(resume)` in `lib/action-helpers.ts`: if `content` is set, returns `contentText` when `hasResumeBody` is true, else null; otherwise returns `originalText`.

`renderResumeText` format: name line, then the contact parts that exist joined by ` | `, then each non empty section as an uppercase heading (`SUMMARY`, `EXPERIENCE`, `EDUCATION`, `SKILLS`, `PROJECTS`, `CERTIFICATIONS`, `LANGUAGES`) followed by its entries; an entry header joins only the parts present with `, ` (`Software Engineer, Acme Corp, Berlin`) and adds a date range in parentheses only when a start or end exists (`(2023-04 to Present)`, `(to 2024-01)`); bullets as `- text`; skills as `Category: a, b, c` (just `a, b, c` when ungrouped); one blank line between sections. No empty separators or empty parentheses ever appear. Deterministic, so the same content always gives the same text (keeps the AI response cache effective). Long text is still cut to 6000 chars by the existing prompt builders (`compressText`).

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `createResume` | `contact.fullName` | `User.name` trimmed; if null or empty, the part of `User.email` before `@`; cut to 120 chars |
| `createResume` | `contact.email` | `User.email` |
| `createResume` | `userId` | session, via `withAction` |
| `createResume`, `saveResumeContent`, accept | `contentText` | derived: `renderResumeText(content)` |
| `createResume`, `saveResumeContent`, accept | `contentUpdatedAt` | server clock at write (`new Date()`); only ever compared for equality, so clock skew does not matter |
| `saveResumeContent` | entry and link `id`s | input (client generates, e.g. `crypto.randomUUID()`); server checks present and unique |
| `getResumeContent` | `content` (current version) | `Resume.content` through `parseResumeContent` |
| `getResume` | `improvedContentText` | derived: `renderResumeText(parseResumeContent(improvedContent))`, null if absent or unparsable |
| analyze, match, interview | text sent to the AI | `getResumeText(resume)` |
| analyze, interview | `sourceContentAt` on the new row | `Resume.contentUpdatedAt` from the row loaded at the start of the action |
| analyze, interview | whether a cached result is fresh | `Analysis.sourceContentAt` / `Interview.sourceContentAt` equals `Resume.contentUpdatedAt` (null equals null) |
| `improveResume` (content path) | rewritten summary and bullets | AI response, through *Improve merge* |
| `improveResume` (content path) | every other draft field | copied from `content` |
| `improveResume` (content path) | whether the draft may be stored | `updateMany({ where: { id, contentUpdatedAt: loaded } })` count is 1 |
| `improveResume` (content path) | `improvedResume` text returned | derived: `renderResumeText(draft)` |
| `improveResume` (content path) | `summary`, `keyChanges` on a cached draft | `""` and `[]` (same as the existing cached text path) |
| detail page | resume text shown | `contentText ?? originalText` from `getResume` |
| detail page | improved panel text | `improvedContentText ?? improvedText` from `getResume` |

**Key invariants**:
- `contentText` always equals `renderResumeText(content)`; both are written in the same `update` call, and `content` is never written anywhere else.
- `content` and `improvedContent` are always valid for `resumeContentSchema` at write time; nothing writes raw client or AI JSON without `parseResumeContent`.
- Writes that depend on loaded content (store draft, accept) are conditional on `contentUpdatedAt` being unchanged; they never overwrite newer content.
- `originalText` is never written by any action in this spec.
- Ids are unique across the whole document.
- `current: true` implies `end` is null; when both `start` and `end` are set, `end ≥ start` (string compare works for `YYYY-MM`).
- The improve merge never adds or removes entries and never changes ids, titles, dates, skills, or contact.
- Clearing a Json column uses `Prisma.DbNull` (Prisma 6 needs this for nullable Json; plain `null` is a type error).

**Security model**:
- Owner only. Every action loads with `loadResumeWithAuth(userId, id)`; writes use `where: { id }` after that check (or `updateMany` with `{ id, userId }`, matching the existing style). `getInterviews` gains the same check (it has none today).
- `content` is the user's own PII (name, email, phone, location). It is sent to OpenRouter only through the existing AI actions, as uploaded text already is; no new third party.
- URLs are limited to http and https, so no `javascript:` or `data:` link can reach the page or the PDF.
- `getResumes` (the list) selects only the existing scalar columns, never the new ones; `getResume` never returns the raw JSON columns.
- Zod caps bound document size (about 600 KB worst case) and the prompt builders bound AI input.
- No new compliance scope beyond what uploads already carry.

**Configuration required**: none. No new env vars or credentials.

**Critical test scenarios**:
- Happy path: create a resume, save a document with two experience entries, reload, get the same document and a matching `contentText`, then run analysis on it, verifies **AC-1**, **AC-2**, **AC-6**.
- Regression: an existing uploaded resume still analyzes, matches, improves, and generates interview questions exactly as before, and its detail page looks the same, verifies **AC-5**, **AC-12**.
- Validation: save with duplicate ids, `current: true` plus an end date, or a `javascript:` URL is rejected with one `<path>: <message>` and the stored row is unchanged, verifies **AC-3**.
- Stale cache: analyze, edit and save, analyze again, a new `Analysis` row is created with the new `sourceContentAt`, verifies **AC-7**.
- Improve draft: improve, reload the detail page and see the draft; save an edit, the draft is gone; improve again, then accept, `content` matches the draft and ids are unchanged, verifies **AC-8**, **AC-9**, **AC-12**.
- Race: save while an improve is in flight; the improve returns "Resume changed, try again" and no draft is stored, verifies **AC-8**.
- Failure case: corrupt `content` by hand in Prisma Studio, load returns the readable error and the row is untouched, verifies **AC-4**; AI failure on improve leaves both columns as they were, verifies **AC-11**.
- Auth/permission: a second user calls save, load, accept, improve, or `getInterviews` with the first user's id and gets "Unauthorized" or "Resume not found", verifies **AC-10**.

## Build plan

Tracer Bullet: the first three tasks are one thin thread (schema to database to action and back), then the AI integration and the detail page thicken it. Task 1 is the only schema change. This project uses `npx prisma db push` (no migrations folder), so do not run `prisma migrate dev`.

1. Add the four nullable columns to `Resume` and `sourceContentAt` to `Analysis` and `Interview` in `prisma/schema.prisma`, run `npx prisma db push` and `npx prisma generate`; confirm existing rows read unchanged, satisfies **AC-5**.
2. Create `lib/resume/content.ts` (Zod schema v1 with normalization, all caps and refinements, inferred type, `parseResumeContent` with a version switch, `emptyResumeContent`, `hasResumeBody`) and `lib/resume/render.ts` (`renderResumeText`), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-6**.
3. Add `createResume`, `saveResumeContent`, `getResumeContent` to `actions/resume.ts` with `safeParse` errors and `revalidatePath`; narrow `getResumes` to an explicit `select` of the existing columns, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-10**.
4. Add `getResumeText` to `lib/action-helpers.ts`; switch `analyzeResume`, `matchResumeToJob`, `generateInterviewQuestions` to it; add the ownership check to `getInterviews`, satisfies **AC-5**, **AC-6**, **AC-10**.
5. Stamp `sourceContentAt` on new `Analysis` and `Interview` rows and add `sourceContentAt: resume.contentUpdatedAt` to the cached lookups, satisfies **AC-7**.
6. Add the structured improve prompt in `lib/prompts/resume-improve.ts` (40 bullet limit), its response type in `types/index.ts`, and `mergeImprovement` in `lib/resume/content.ts`, satisfies **AC-8**.
7. Branch `improveResume` (content first): return a stored draft if present, else call the AI with the versioned dedup key, merge, store `improvedContent` conditionally on `contentUpdatedAt`, return the rendered draft; the text path stays as is, satisfies **AC-5**, **AC-8**, **AC-11**.
8. Add `acceptImprovedContent` (conditional on `contentUpdatedAt`, parse draft again) and `discardImprovedContent` to `actions/improve.ts`; make `saveResumeContent` clear the draft, satisfies **AC-9**, **AC-10**.
9. Extend `getResume` with `contentText`, `contentUpdatedAt`, `improvedContentText`; update `app/(dashboard)/resumes/[id]/page.tsx` to show `contentText ?? originalText` and `improvedContentText ?? improvedText` (and `hasImprovement` from either), satisfies **AC-12**, **AC-5**.
10. Run `npm run lint` and `npm run build`; run the critical test scenarios against the real app and database (create and save have no UI yet, so drive them from a temporary dev only page or script, and check rows in Prisma Studio), satisfies **AC-1** to **AC-12**.

## Consequences

**Positive**:
- One shape for editor, AI writing, import, and PDF export; later section changes are a schema version bump, not a data migration.
- Existing AI actions change by one line each; uploads and their history are untouched.
- A save is one atomic row update, so a document is never half written and reorder is free.
- Cached AI results and drafts can never silently describe content the user has since changed.

**Negative / tradeoffs**:
- The database does not enforce the section shape; correctness depends on every write going through `parseResumeContent`. A stray direct Prisma write could store bad JSON (AC-4 contains the blast radius).
- `contentText` is a stored derived value; it is safe only because it is written in the same update as `content`. Any future code path that writes `content` must also render.
- `Resume.atsScore` and the latest analysis panel on the detail page can show results for older content until the next analysis; the cache check prevents reuse but the page still displays the last row. Feature 2 may mark it as out of date.
- Analyses and interviews created before this change have `sourceContentAt` null, so they stay reusable only for resumes that never get sections (correct for uploads).
- Improve on a sectioned resume rewrites only the summary and up to 40 bullets, not titles or skills.
- Last write wins between two tabs saving at once: one save silently loses.

**Neutral**:
- Prisma `Json` values come back as `JsonValue`; always pass them through `parseResumeContent` before use, never cast.
- The interview cache ignores the job description (an existing behavior, unchanged here).

## Follow-up

- [ ] Feature 2 (resume maker) owns the editor, the draft accept or discard buttons, how a resume with no upload is introduced on the detail page, and whether to mark old analyses as out of date. It may add an optimistic save check (send the loaded `contentUpdatedAt`) if two tab saves become a real problem.
- [ ] Feature 6 (import) writes into `content` on the same row through `saveResumeContent` rules; it must call `parseResumeContent` on the AI split output.
- [ ] Until feature 2 ships, `/check verify` has no real UI path for AC-1 to AC-4 and AC-9; plan to verify them by calling the actions from a temporary dev only page or script.
- [ ] `lib/resume/` is a new area; `/sync` may want a short `lib/resume/AGENTS.md` (always parse through `parseResumeContent`, always render on write, `Prisma.DbNull` for clearing, conditional writes on `contentUpdatedAt`).
- [ ] Root `AGENTS.md` says `max_tokens: 1024` while `lib/ai/client.ts` uses 2048; `/sync` should correct it.
