# 0006. Import an uploaded resume: one AI call splits the text into a new linked built copy

**Date**: 2026-10-31
**Status**: In Progress

## Summary

You can now open an uploaded resume in the section editor. One AI call reads the uploaded text and splits it into sections, word for word (no rewriting), and the app saves the result as a new built resume linked to the upload, then opens it in the editor. The upload itself is never changed. Anything the sections cannot hold (an unclear date, an award with no fitting place, text past the limits) is listed in a notice in the editor, so nothing is lost silently. Each import costs one AI use from the spec 0004 balance, and it is given back if the import fails.

## Requirements

**User stories**:
- As a job seeker with an uploaded resume, I want to open it in the section editor so that I can edit it section by section without typing it all again.
- As a job seeker, I want my upload left exactly as it was, so that its analyses and history stay valid and I can always compare against it.
- As a job seeker, I want the import to keep my own words and to tell me what it could not place, so that I can trust the sections and fix the gaps myself.
- As a job seeker who already imported a resume, I want to reopen that copy for free instead of paying for the same import again.

**Acceptance criteria**:
- **AC-1**: An uploaded resume (no sections) with non blank text shows an "Open in editor" button on its detail page, in the spot where built resumes show "Edit resume". The edit page of an upload (`/resumes/[id]/edit`) shows the same button instead of the "comes with import" message. Each uploaded row in the resume list has an "Open in editor" link to that edit page. An upload whose text is blank shows the button as unavailable (`aria-disabled`) with the hint "This upload has no text to import".
- **AC-2**: Pressing the button opens a dialog that says "Uses 1 AI use. You have <`balanceLabel`>." using the spec 0004 wording (for example "Uses 1 AI use. You have 3 free AI uses left." or "Uses 1 AI use. You have 5 credits."). With no uses left, the dialog shows only "Uses 1 AI use." plus the hint "No AI uses left. See pricing" (not the balance sentence too), where "See pricing" links to `/pricing`, and the Import button is unavailable (`aria-disabled`). If the balance could not be loaded, the dialog shows only "Uses 1 AI use." and Import stays available (the server still checks).
- **AC-3**: A successful import creates a new built resume owned by the signed in user, titled `<upload title> (editable)` (the upload title is cut so the whole title is at most 200 characters), with `content`, `contentText`, and `contentUpdatedAt` set as `createResume` sets them, `importedFromId` set to the upload, and `importNotice` set. The browser then goes to `/resumes/<new id>/edit`. The upload row is not written: its `title`, `originalText`, `improvedText`, `atsScore`, `updatedAt`, analyses, and interviews are unchanged.
- **AC-4**: The import keeps the upload's wording. The only changes allowed are: joining lines broken mid sentence, removing bullet symbols and numbering, trimming spaces, placing text into sections, and writing dates as `YYYY-MM`. The AI never rewrites, summarizes, translates, or adds facts. Volunteering goes into Experience, awards and honors into Certifications (name, issuer, date), publications into Projects (name, url, date as start). Any text that still fits no section is returned as unplaced text and shown in the notice (AC-8).
- **AC-5**: Contact comes from the upload text: full name, email, phone, location, and links. If the text has no name, the account name is used (else the part of the account email before `@`), as in `createResume`. If the text has no valid email, the account email is used. Phone, location, and links come from the text only.
- **AC-6**: The AI answer is cleaned before saving by the rules in the *Cleaner rules* table below, and the saved document always passes `parseResumeContent`. Server generated ids replace anything the AI sent. A required field the AI left empty is filled with a visible placeholder (`[Job title]`, `[Company]`, `[School]`, `[Project name]`, `[Name]`, `[Language]`), and a link with no label gets its URL's host name as label. A date that is not an exact `YYYY-MM` is left empty and noted in the notice (for example `Acme Corp: start date "2019" not imported`); "Present" or "Current" as an end date sets `current: true` in every dated section; when `current` is true any end date is cleared; an end before its start is dropped and noted. An invalid URL or email is dropped and noted. Over the schema caps (more than 12 bullets, 30 entries, 10 links, 50 skills in a group), the extra items move to the notice; an over long summary or bullet is cut at the last word boundary with its full text added to the notice; any other over long field is dropped and noted.
- **AC-7**: The AI reads the first 15000 characters of the trimmed upload text. When the text was longer, the notice says "Your upload was longer than the import can read, so the end may be missing."
- **AC-8**: The editor of an imported copy shows an import notice above the sections: "Imported from <upload title>. Check each section against your original." (the title links to the upload; just "Imported from an upload" when the upload was deleted), the AC-7 line when it applies, and a "Not imported" list with each item and a Copy button. The notice stays across reloads and saves until the user presses Dismiss, which clears it on the server. Dismiss never changes the resume's content version, so unsaved edits in the editor can still be saved afterwards.
- **AC-9**: When the upload already has one or more imported copies, the dialog says "You already imported this resume." and offers "Open the imported copy" (the newest copy, no AI use) as the main action and "Import again" (1 AI use, creates another copy) as the second. "Import again" behaves exactly like a first import.
- **AC-10**: Each import that creates a copy uses exactly one AI use (spec 0004 rules, purpose `IMPORT`, the ledger `resumeId` is the upload's id). An import that fails uses nothing: rejections before the AI call (cooldown, invalid input, not the owner, a resume that already has sections, blank upload text, a copy of this upload created in the last 120 seconds, limit reached) never charge and make no AI call; a use reserved before the AI call is refunded when anything after the reserve fails before the copy is created (the account lookup, the AI call, an unusable answer, a cleaned result with no summary and no entries, or the save). Once the copy exists the charge is kept, even if a later step such as cache revalidation fails.
- **AC-11**: While an import runs, the dialog shows a spinner with "Reading your resume. This can take up to a minute.", every action in it is unavailable, and it cannot be closed (Escape and clicking outside do nothing). If no answer arrives within 100 seconds, the dialog stops waiting and says "This is taking too long. If it finishes, the copy will appear in your Resumes list." with Close; closing it calls `router.refresh()` so the page picks up a copy that finished meanwhile (AC-9 then offers "Open the imported copy"). An import that finishes after that is a normal, charged copy; if its answer arrives while the timed out dialog is still open, the browser goes to the editor as on success.
- **AC-12**: When an import fails, the dialog shows the server message with "Try again" (a new request with a new nonce), and nothing is created. A result with no summary and no entries fails with "The AI could not find resume sections in this text. Try again." The spec 0004 limit message shows "See pricing" and Close instead of Try again.
- **AC-13**: `importResume` and `dismissImportNotice` are owner only: another user's resume id returns "Resume not found" or "Unauthorized", and nothing is read, charged, or written. `importResume` on a resume that already has sections returns "This resume already has sections"; on blank upload text, "This upload has no text to import"; when a copy of this upload was created in the last 120 seconds (two tabs, or a press after a client timeout), "An import of this resume just finished. Open it from your Resumes list." with no AI call and no charge. A second import by the same user within 3 seconds returns "Please wait a moment before trying again" with no AI call.
- **AC-14**: The detail page of an imported copy shows "Imported from <upload title>" in its header, linking to the upload. There is no such line when the upload was deleted.
- **AC-15**: Deleting the upload keeps every imported copy; their `importedFromId` becomes null. Deleting a copy never touches the upload.
- **AC-16**: Every other AI action keeps today's request settings (2048 max tokens, the `AI_TIMEOUT_MS` timeout, the current retries); only import passes its own budget.

## Decision

**Chosen option**: Option 1: A new built copy linked to the upload, created from one AI call with its own token and time budget, saved first and then opened in the editor.

Add `importedFromId` and `importNotice` to `Resume`, a per call options argument to `callAI`, a cleaner in `lib/resume/import.ts`, and one `importResume` server action that reserves a use, calls the AI, cleans the answer, and creates the copy (refunding on any failure after the reserve).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (Prisma, applied with `npx prisma db push`; this project has no migrations folder):

`Resume` (existing table, additive, nothing removed or renamed):

| Column | Type | Null | Notes |
|---|---|---|---|
| `importedFromId` | `String` | yes | FK → `Resume.id`, self relation `ResumeImport`, `onDelete: SetNull`. Set only on copies made by import |
| `importNotice` | `Json` (JSONB) | yes | `{ schemaVersion: 1, leftover: string[], truncated: boolean }`. Written by import, cleared to `Prisma.DbNull` by Dismiss |

```prisma
importedFromId String?
importedFrom   Resume?  @relation("ResumeImport", fields: [importedFromId], references: [id], onDelete: SetNull)
importedCopies Resume[] @relation("ResumeImport")
importNotice   Json?

@@index([importedFromId])
```

- Relationship: one upload has many imported copies (1:N, self relation). A copy and its upload always have the same `userId`.
- `importNotice` is always written by an import (the "check each section" reminder is itself worth showing), so it is null only on non imported resumes and after Dismiss.
- `importNoticeSchema` (Zod, in `lib/resume/import.ts`): `leftover` at most 40 strings of 1..2000 chars; total leftover at most 20000 chars (items past that are dropped with a final item "More text could not be shown."); `truncated` boolean. A stored value that fails the schema is treated as no notice and logged.
- No change to `AiPurpose` (it already has `IMPORT`) or any other table.

**State transitions**:
- Upload: never changes. It gains copies; `importedCopies` grows by one per successful import.
- Copy notice: `importNotice` set (at create) → null (Dismiss). No way back; importing again makes a new copy with its own notice.
- Import request (dialog): idle → running → (success: navigate to editor) | (failed: error, Try again → running) | (timed out after 100 s: closed). Only one request per dialog at a time.

**AI client change** (`lib/ai/client.ts`, AC-16): `callAI<T>(system, user, dedupKey?, options?)` with `options: { maxTokens?: number; timeoutMs?: number; retries?: number; compress?: boolean }`. Absent options keep today's values exactly (2048, `AI_TIMEOUT_MS`, `MAX_RETRIES`, compression on). `options` is not part of the cache key; callers vary the prompt or the dedup key when they need a fresh answer.
- `compress: false` skips `compressText` for both prompts: the text is sent as given, so repeated lines (the same bullet twice, repeated dates) and blank lines (section breaks) reach the AI. Today's compression drops every repeated line, removes blank lines, and appends `[truncated]` past 16000 characters, which would lose resume text without notice.
- `retries` is the number of extra attempts: `retries: 0` means exactly one attempt, and no result is retried, including results marked retryable (5xx, empty response, invalid JSON).
- The timeout error text is built from the timeout in use ("AI request timed out after 90 seconds."), and the provider error text drops "Retrying..." when no retry is left.
- When the provider reports `finish_reason: "length"` (the answer hit `max_tokens`), return `INVALID_RESPONSE` with the message "The AI answer was too long. Try again." instead of a JSON parse error.
- Import passes `IMPORT_AI_OPTIONS = { maxTokens: 5000, timeoutMs: 90_000, retries: 0, compress: false }` (in `lib/resume/import.ts`). 5000 tokens fits the JSON for a 15000 character resume (about 4000 tokens) with room to spare, and is more likely than 8000 to finish within 90 s on free models. One attempt plus the database work fits inside the page's `maxDuration = 120`.
- Every import logs its outcome (`[Import] ok|timeout|too_long|invalid|empty`, duration, input length) so the timeout rate on free models can be watched.

**Prompt** (`lib/prompts/resume-import.ts`): `RESUME_IMPORT_SYSTEM_PROMPT` and `buildResumeImportPrompt({ text, nonce })`. The system prompt states the AC-4 rules (copy word for word, the only allowed changes, the section mapping, never invent), asks for a single JSON object, dates as `YYYY-MM` only when month and year are both written (otherwise the date exactly as written), "Present" as `current: true`, and no ids. Answer shape (all fields optional, typed as `ResumeImportAIResponse` in `types/index.ts` with every field `unknown`):

```
{ contact: { fullName, email, phone, location, links: [{ label, url }] },
  summary,
  experience: [{ title, company, location, start, end, current, bullets[] }],
  education: [{ school, degree, field, location, start, end, current, bullets[] }],
  skills: [{ category, items[] }],
  projects: [{ name, role, url, start, end, current, bullets[] }],
  certifications: [{ name, issuer, date, url }],
  languages: [{ language, proficiency }],
  unplaced: [string] }
```

The user prompt carries the nonce on its own line (`Request: <nonce>`) so the 5 minute prompt cache never replays an earlier import. The system prompt stays under 4000 characters and the user prompt wrapper (everything but the resume text) under 1000, so the whole user prompt stays under 16000 characters even though compression is off.

**Cleaner** (`lib/resume/import.ts`, pure, no `"use server"`): `cleanImportedResume(raw: unknown, fallback: { fullName: string; email: string }): { content: ResumeContent; leftover: string[] }`.
- Reads each field leniently (a non string becomes absent, a non array becomes `[]`), trims, and drops empty items.
- Applies every AC-6 rule in schema order: contact (AC-5 fallbacks), summary, then each list, using the table below. Section caps keep the first items; the rest are rendered as plain lines into leftover.
- Placeholder text for missing required fields is the AC-6 list; for skills, a group with no items is dropped.

*Cleaner rules* (label = how a notice item names its entry; overflow line = how a whole entry past the cap is written into leftover; dates always say which one, `start date` or `end date`, or `date` for a certification):

| Section | Label | Overflow line | Field rules |
|---|---|---|---|
| Contact | `Contact` | n/a | `fullName` over 120 → cut at word boundary, full text noted; email checked with the same `z.email()` as the schema, invalid → account email (AC-5) and the text value noted; phone over 40 or location over 120 → dropped and noted; links: invalid or over 500 char URL → dropped and noted; duplicate URL (case insensitive) → removed silently; label over 40 → cut; more than 10 → extra links noted as `label: url` |
| Summary | `Summary` | n/a | over 3000 → cut at word boundary, full text to leftover |
| Experience | company, else title | `Company, Title, Location (start to end): bullet; bullet` | title, company over 200 or location over 120 → dropped and noted (required ones get the placeholder); bullets over 500 → cut at word boundary, full text to leftover; bullets past 12 → leftover as `Label: bullet` |
| Education | school | `School, Degree, Field (start to end): bullet; bullet` | same as Experience for degree, field, location, bullets |
| Projects | name | `Name, Role, url (start to end): bullet; bullet` | same as Experience for role, bullets; invalid url → dropped and noted |
| Certifications | name | `Name, Issuer (date), url` | name or issuer over 200 → dropped and noted; invalid url → dropped and noted |
| Languages | language | `Language: proficiency` | over 60 → dropped and noted |
| Skills | category, else `Skills` | `Category: a, b, c` | items split on commas, trimmed, duplicates removed (case insensitive); an item over 60 → not kept, listed whole as `Label: item`; items past 50 → leftover as one `Label: a, b, c` line; category over 60 → cut to 60 |

Overflow lines skip absent parts the same way `renderResumeText` does (no empty separators or parentheses).

*Notice limits*: a leftover string longer than 2000 characters is split into parts of at most 2000 at word boundaries, each part its own item. Items are kept in order while both limits hold: at most 40 items and at most 20000 characters in total, each counting the closing item. When an item would break either limit, it and every later item are dropped, and the last kept slot becomes "More text could not be shown." (so the earliest text always survives).
- Assigns ids with `crypto.randomUUID()`.
- Appends the AI's `unplaced` strings to leftover (each cut to 2000 chars).
- Runs `parseResumeContent` on the result; a failure here is a bug, logged with the first issue, and surfaces as "The AI answer could not be used. Try again." (refunded).
- Throws `IMPORT_EMPTY` ("The AI could not find resume sections in this text. Try again.") when `hasResumeBody(content)` is false.

**API surface** (server actions through `withAction`, authenticated, owner checked with `loadResumeWithAuth`):

| Action | File | Key inputs | Key outputs | Key errors |
|---|---|---|---|---|
| `importResume` | `actions/resume-import.ts` (new) | `resumeId: string` (req), `nonce: string` (req, 1..64) | `{ id: string; balance: AiBalanceView }` | "Resume not found" · "Unauthorized" · "This resume already has sections" · "This upload has no text to import" · cooldown · `AI_LIMIT_REACHED` · `AI_BALANCE_UNAVAILABLE` · AI errors · "The AI answer could not be used. Try again." · `IMPORT_EMPTY` · "Could not save the imported resume. Try again." |
| `dismissImportNotice` | `actions/resume-import.ts` | `resumeId: string` (req) | `void` | "Resume not found" · "Unauthorized" |
| `getResumeContent` (changed) | `actions/resume.ts` | unchanged | adds `importNotice: ImportNotice \| null` (parsed, never raw), `importedFrom: { id, title } \| null`, `latestImport: { id, title } \| null`, `hasUploadText: boolean` (`originalText?.trim()` non blank) | unchanged |
| `getResume` (changed) | `actions/resume.ts` | unchanged | adds `importedFrom: { id, title } \| null`, `latestImport: { id, title } \| null`; adds `importNotice: true` to its `omit` so it still never returns a raw JSON column | unchanged |
| `deleteResume` (changed) | `actions/resume.ts` | unchanged | unchanged | also `revalidatePath("/resumes")`; the copy's detail and edit pages are dynamic, so they read the cleared link on the next request |

`importResume` order:
1. `withAction` with `{ cooldown: true, cooldownKey: "ai-import", cooldownMs: 3000 }`.
2. Zod input check (`safeParse`, `zodIssueMessage`); `loadResumeWithAuth`; `content !== null` → "This resume already has sections"; `originalText?.trim()` blank → "This upload has no text to import"; a copy with `importedFromId = resumeId`, the same `userId`, and `createdAt` within the last 120 seconds → `IMPORT_JUST_FINISHED` ("An import of this resume just finished. Open it from your Resumes list."). All before the reserve, so all free. (The `withAction` cooldown lives in one server's memory, so this database check is what stops two tabs or a press after a client timeout from paying twice; two requests started within the same second can still both pass, which is accepted.)
3. `reserveAiUse(userId, "IMPORT", resumeId)`.
4. Steps 4 to 7 run inside one `try`; any error refunds with `refundAiUse(userId, ledgerId)` and is rethrown (a Prisma error is logged and rethrown as "Could not save the imported resume. Try again."). `text = originalText.trim()`; `truncated = text.length > 15000`; send `text.slice(0, 15000)`.
5. `callAI<ResumeImportAIResponse>(system, prompt, \`import:${userId}:${resumeId}:${nonce}\`, IMPORT_AI_OPTIONS)`; on `!success` throw the AI error (refunded by the `try`).
6. Load the account `name` and `email` for the fallback (null user → "Unauthorized", refunded); `cleanImportedResume`.
7. `prisma.resume.create` with `userId`, the title, `content`, `contentText: renderResumeText(content)`, `contentUpdatedAt: new Date()`, `importedFromId: resumeId`, `importNotice: { schemaVersion: 1, leftover, truncated }`, `select: { id: true }`. A foreign key error because the upload was deleted meanwhile lands in the same refund path.
8. After the `try` (the copy exists, so nothing here refunds or fails the action): `revalidatePath` for `/dashboard`, `/resumes`, `/resumes/${resumeId}`, `/resumes/${id}`, each in its own `try` that only logs; return `{ id, balance }`.

`dismissImportNotice`: `loadResumeWithAuth`, then `updateMany({ where: { id, userId }, data: { importNotice: Prisma.DbNull } })`; does not touch `contentUpdatedAt`; `revalidatePath(\`/resumes/${id}/edit\`)`.

`latestImport` query: `prisma.resume.findFirst({ where: { importedFromId: id, userId }, orderBy: { createdAt: "desc" }, select: { id: true, title: true } })`. `importedFrom` comes from the relation with `select: { id: true, title: true }`.

**UI** (theme tokens and existing primitives only, `components/ui/dialog.tsx`, `Button`, `Badge`):
- `components/resume/import-resume-button.tsx` (new, client): the button plus dialog. Props: `resumeId`, `hasText`, `balance: AiBalanceView | null`, `latestImport: { id, title } | null`. Generates the nonce with `crypto.randomUUID()` per press. Watchdog of 100 s ignores a late answer (same pattern as `components/resume/editor/ai-writing.tsx`). While running, the `Dialog` `onClose` does nothing. On success `router.push(\`/resumes/${id}/edit\`)`.
- Detail page `app/(dashboard)/resumes/[id]/page.tsx`: for uploads render `ImportResumeButton` where "Edit resume" is; load the balance with `getAiBalanceForUser()` alongside `getResume`; add `export const maxDuration = 120` (the action runs under the page that calls it); show the AC-14 line for copies.
- Edit page `app/(dashboard)/resumes/[id]/edit/page.tsx`: the upload `Notice` gets `ImportResumeButton` and the message "Open this upload in the editor. The AI splits it into sections you can edit." in place of the "comes with import" text; pass `importNotice` and `importedFrom` to `ResumeEditor` for copies.
- Resume list `components/resume/resume-list.tsx`: uploaded rows get an "Open in editor" link to `/resumes/${id}/edit` (the edit page's notice holds the button, so the list needs no dialog or balance).
- Editor `components/resume/editor/import-notice.tsx` (new, client): the AC-8 notice, rendered by `resume-editor.tsx` above the sections when `initialImportNotice` is set. Copy uses `navigator.clipboard.writeText` with a short "Copied" state; Dismiss calls `dismissImportNotice` and hides the notice on success (shows the error inline on failure and keeps the notice).

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `importResume` | upload text sent to the AI | `Resume.originalText` of the upload, trimmed, first 15000 chars |
| `importResume` | `truncated` | derived: trimmed `originalText.length > 15000` |
| `importResume` | sections of the copy | AI answer through `cleanImportedResume` |
| `importResume` | entry and link ids | server, `crypto.randomUUID()` |
| `importResume` | `contact.fullName` fallback | `User.name` trimmed, else `User.email` before `@`, cut to 120 (same rule as `createResume`) |
| `importResume` | `contact.email` fallback | `User.email` |
| `importResume` | copy title | upload `title` cut to 189 chars, trailing spaces trimmed, plus ` (editable)` |
| `importResume` | whether an import just finished | newest `Resume.createdAt` where `importedFromId = resumeId` and same `userId`, compared with the server clock (120 s) |
| `importResume` | `contentText`, `contentUpdatedAt` | `renderResumeText(content)`; server clock at write |
| `importResume` | `importedFromId` | input `resumeId` (after the owner check) |
| `importResume` | `leftover` | cleaner overflow and notes, plus the AI's `unplaced` |
| `importResume` | the charge | `reserveAiUse(userId, "IMPORT", resumeId)` (spec 0004) |
| `importResume` | `balance` returned | the view returned by `reserveAiUse` |
| `importResume` | `userId` | session, via `withAction` |
| dialog | balance line | `getAiBalanceForUser()` loaded by the page, `balanceLabel` (spec 0004) |
| dialog | whether a copy exists, and which to open | `latestImport` from `getResume` / `getResumeContent` |
| dialog (edit page) | whether the upload has text | `hasUploadText` from `getResumeContent` |
| dialog (detail page) | whether the upload has text | derived on the page: `originalText?.trim()` non blank, from `getResume` (already returned) |
| resume list | upload text state | not needed: the row links to the edit page, whose button shows the AC-1 unavailable hint |
| dialog | nonce | client, `crypto.randomUUID()` per press |
| editor notice | upload title and link | `importedFrom` from `getResumeContent` |
| editor notice | leftover list, truncated line | `Resume.importNotice` through `importNoticeSchema` |
| detail page | "Imported from" line | `importedFrom` from `getResume` |
| resume list | whether a row is an upload | `contentUpdatedAt === null` (already selected) |

**Key invariants**:
- The upload row is never written by import. Every write in this spec targets the new copy or (Dismiss) the copy's `importNotice`.
- A copy exists only together with a kept charge: every path that fails after `reserveAiUse` and before the copy is created refunds before throwing; nothing after the create can refund or fail the action.
- Import text reaches the AI uncompressed (`compress: false`), so no line of the first 15000 characters is dropped before the AI sees it.
- The stored `content` always passes `parseResumeContent`; `contentText` is written in the same `create` call (spec 0001 rule).
- `importNotice` writes go through `importNoticeSchema`; clearing uses `Prisma.DbNull`.
- Dismiss never changes `content` or `contentUpdatedAt`, so it never causes the editor's version check (spec 0002) to fail.
- The AI never supplies ids; all ids are unique across the document (server generated UUIDs).
- No date is ever invented: only exact `YYYY-MM` values are stored.

**Security model**:
- Owner only. Both actions load with `loadResumeWithAuth(userId, resumeId)`; the copy is created with the session `userId`; `latestImport` and `importedFrom` queries filter by `userId`.
- The upload text is the user's own PII and already goes to OpenRouter through analysis and improve; import sends it the same way, no new third party.
- URLs are limited to http and https by the schema, so no `javascript:` link can reach the editor or later the PDF.
- The leftover list is rendered as React text (never raw HTML).
- Charging rules and the "browser cannot change credits" rule come from spec 0004 unchanged.
- No new compliance scope.

**Configuration required**: none. No new env vars; the import budget is code constants.

**Critical test scenarios**:
- Happy path: upload a real PDF resume, press Open in editor, confirm, land in the editor with contact, summary, experience, education, and skills filled word for word, edit and Save; the upload's detail page is unchanged, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**.
- Cleanup: an upload with "2019" dates, an award, a volunteer role, 15 bullets under one job, and a `javascript:` link: the copy has the volunteer role in Experience, the award in Certifications, 12 bullets, no bad link, and the notice lists the dates, the 3 extra bullets, and the link, verifies **AC-4**, **AC-6**, **AC-8**.
- Long upload: a 20000 character text shows the truncated line in the notice, verifies **AC-7**.
- Notice: reload and Save keep the notice; Dismiss removes it, and a later Save with unsaved edits succeeds without a conflict, verifies **AC-8**.
- Import again: the dialog offers Open the imported copy (no balance change) and Import again (one more use, a second copy), verifies **AC-9**, **AC-10**.
- Failure case: set `OPENROUTER_MODEL` to an invalid model; the dialog shows the AI error with Try again, no copy exists, and the ledger shows a `IMPORT` use and its `REFUND`, verifies **AC-10**, **AC-12**.
- Empty result: an upload of plain unrelated text yields `IMPORT_EMPTY`, refunded, verifies **AC-10**, **AC-12**.
- Limit: with 0 uses, Import is unavailable; forcing the call returns the 0004 limit message with no AI call, verifies **AC-2**, **AC-10**, **AC-12**.
- Slow AI: a 100 s wait shows the timeout message; when the import finishes later, the copy appears in Resumes, and closing the dialog then shows "Open the imported copy", verifies **AC-11**, **AC-9**.
- Double import: start an import in two tabs a few seconds apart; the second returns the "just finished" message (or, if both started together, both copies are charged once each and nothing else breaks), verifies **AC-10**, **AC-13**.
- Repeated lines: an upload where two jobs share an identical bullet keeps the bullet under both jobs, verifies **AC-4**.
- Real long resume smoke test: a real two page resume of about 12000 characters imports within 90 s on the configured free model; note the time in the verify log, verifies **AC-7**, **AC-11**.
- Auth/permission: a second user calls `importResume` and `dismissImportNotice` with the first user's ids and gets "Unauthorized" or "Resume not found", with no ledger row, verifies **AC-13**.
- Delete: delete the upload; the copy stays, its header line and notice link are gone, verifies **AC-14**, **AC-15**.
- Regression: run ATS analysis and section writing after the change; both behave as before, verifies **AC-16**.

## Build plan

Tracer Bullet: tasks 1 to 4 are one thin thread (schema, AI budget, cleaner, action, a button on the detail page, landing in the editor), then the notice, import again, and the other entry points thicken it. Task 1 is the only schema change; use `npx prisma db push`, not `prisma migrate dev`.

1. Add `importedFromId` (self relation `ResumeImport`, `onDelete: SetNull`, index) and `importNotice` to `Resume` in `prisma/schema.prisma`; run `npx prisma db push` and `npx prisma generate`, satisfies **AC-3**, **AC-15**.
2. Add the optional `options` argument (`maxTokens`, `timeoutMs`, `retries`, `compress`) to `callAI` in `lib/ai/client.ts`, defaults unchanged; build the timeout and provider error texts from the options; map `finish_reason: "length"` to the "too long" message; note it in `lib/ai/AGENTS.md`, satisfies **AC-16**, **AC-11**, **AC-4**.
3. Create `lib/prompts/resume-import.ts`, `ResumeImportAIResponse` in `types/index.ts`, and `lib/resume/import.ts` (`cleanImportedResume`, `importNoticeSchema`, `IMPORT_EMPTY`, the budget constants, the title helper), satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**.
4. Create `actions/resume-import.ts` with `importResume` (the 8 step order, refund on every failure after the reserve) and a first `ImportResumeButton` on the detail page for uploads (dialog, cost and balance line, running state, navigate on success), plus `maxDuration = 120` on the detail page, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-10**, **AC-11**, **AC-12**, **AC-13**.
5. Add `dismissImportNotice`; extend `getResumeContent` with `importNotice` and `importedFrom`; add `import-notice.tsx` and render it in `resume-editor.tsx`, satisfies **AC-8**, **AC-13**.
6. Extend `getResume` (plus `importNotice: true` in its `omit`) and `getResumeContent` with `latestImport` (and `hasUploadText` on `getResumeContent`); add the "already imported" dialog state and the `router.refresh()` after a timed out dialog closes; add the "Imported from" header line for copies; add `revalidatePath("/resumes")` to `deleteResume`, satisfies **AC-9**, **AC-11**, **AC-14**, **AC-15**.
7. Replace the edit page's upload notice text with `ImportResumeButton`, and add the "Open in editor" link to uploaded rows in `resume-list.tsx`; blank text uploads show the unavailable hint, satisfies **AC-1**.
8. Run `npm run lint` and `npm run build`; run the critical test scenarios against the real app and database, checking the ledger and the upload row in Prisma Studio, satisfies **AC-1** to **AC-16**.

## Consequences

**Positive**:
- Uploads become editable without retyping, while the upload and its analysis history stay a trusted original.
- One AI call means one charge, one refund path, and one place for failures.
- Nothing is lost silently: what the schema cannot hold is listed for the user to place.
- The `callAI` options are reusable by later heavy calls (PDF export does not need them, but a future cover letter import would).

**Negative / tradeoffs**:
- A paid import can produce a copy with mistakes (a section split wrong). The user fixes it in the editor or deletes it and imports again, paying again; there is no free retry.
- Free models may take most of the 90 s budget (at about 30 to 50 tokens a second, a 4000 token answer takes 80 to 130 s), so timeouts on long resumes are an expected outcome, not a rare edge case; each is refunded and logged. With `retries: 0` a single provider hiccup fails the import too. Retrying would not fit inside the route's 120 s limit.
- The host plan must allow functions to run 120 s (`maxDuration` is a request to the host, not a guarantee); on a plan with a lower cap, the function can be cut off between the reserve and the refund.
- The "no rewriting" rule (AC-4) is enforced only by the prompt; nothing checks the output against the source text.
- Import again creates more copies, which can clutter the resume list.
- Placeholders in entry title or company fields (`[Company]`) are not counted by the spec 0003 save warning, which counts only summary, bullets, and skills; the user sees them in the fields themselves.
- A copy and its upload are two rows with separate analyses; analyses of the upload do not carry over.

**Neutral**:
- One `db push` adding two nullable columns and an index; existing rows are untouched.
- `callAI` gains a fourth argument; all current call sites keep compiling unchanged.

## Follow-up

- [ ] `/sync` after the build: add the `callAI` options argument to `lib/ai/AGENTS.md` and the import action to the root `AGENTS.md` project structure.
- [ ] After a week of real imports, read the `[Import]` logs: if timeouts are common, consider a more compact answer shape (shorter keys) or a faster model for import.
- [ ] Consider a cheap fidelity check: flag in the notice any bullet whose words mostly do not appear in the upload text.
- [ ] Confirm the hosting plan allows 120 s functions before release.
- [ ] Spec 0007 (PDF export) can rely on imported copies being ordinary built resumes; nothing import specific is needed there.
