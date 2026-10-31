# Verify: Structured resume data model · spec 0001 · updated 2026-10-30
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Create, save, accept, and discard have no UI yet (feature 2 owns the editor). You can drive them from a temporary dev only page that imports the actions from `actions/resume.ts` and `actions/improve.ts`, signed in as a real user, and check rows in `npx prisma studio`. Remove the page afterwards.

## UI / manual
- [x] Signed in as user A, call `createResume("Test")` → returns `{ id }`; in Studio `content.contact.fullName` is your account name (or the part of your email before `@` if the name is empty), `contact.email` is your email, every list is `[]`, `summary` is `""`, `contentText` is set, `contentUpdatedAt` is set, `originalText` is null → AC-1
- [x] Repeat `createResume` with a user whose `name` is null → `fullName` is the email prefix, cut to 120 chars → AC-1 (Value sourcing: `contact.fullName`)
- [x] Call `saveResumeContent(id, doc)` with two experience entries, a skills group, and padded strings (`"  Ada  "`, `phone: ""`) → `getResumeContent(id)` returns the same document with strings trimmed and `phone` absent; `contentText` matches the rendered text; `improvedContent` is null → AC-2
- [x] Save with `experience.0.title: ""` → error `experience.0.title: Required`, row unchanged in Studio → AC-3
- [x] Save with a duplicate id, `current: true` plus `end`, `end` before `start`, `start: "2024-13"`, a `javascript:` link, 13 bullets, `schemaVersion: 2` → each returns one `<path>: <message>` error and nothing is written → AC-3
- [x] In Studio, set `content` to `{"schemaVersion":1,"contact":5}` → `getResumeContent(id)` returns "This resume's sections could not be read", the server log shows the cause, and the row is unchanged; analyze on it returns the same readable error → AC-4
- [x] Open an existing uploaded resume → list, detail page, analysis, job match, improve, and interview questions behave exactly as before (detail page shows the uploaded text) → AC-5, AC-12
- [x] Analyze a resume created with `createResume` and never filled → "Resume has no text content"; save a summary, analyze again → AI runs on the rendered text; job match and interview questions also work → AC-6 (Value sourcing: text sent to the AI)
- [x] Analyze the sectioned resume twice → second call reuses the cached row; save an edit, analyze again → a new `Analysis` row with the new `sourceContentAt` → AC-7 (Value sourcing: `sourceContentAt`, cache freshness)
- [x] Start an analysis, save an edit before it finishes, then analyze again → the second run calls the AI (the first row is stamped with the old `sourceContentAt`) → AC-7
- [x] Same flow for interview questions → reused until a save, regenerated after → AC-7
- [x] Improve a sectioned resume → `improvedContent` is set in Studio, `content` is unchanged, only summary and experience/project bullets differ, ids and titles are the same → AC-8 (Value sourcing: rewritten summary and bullets, every other draft field)
- [x] Improve again → the stored draft comes back with no new AI call (no new `[AI]` log line) → AC-8
- [x] Save while an improve is running → improve returns "Resume changed, try again" and no draft is stored → AC-8
- [x] Reload the detail page with a draft → the Improved Resume panel shows the rendered draft; the Resume panel shows `contentText` → AC-12
- [ ] `acceptImprovedContent(id)` → `content` equals the draft, `contentText` rerendered, new `contentUpdatedAt`, draft cleared; call it again → "No improvement draft to apply" → AC-9
- [ ] Improve, then `discardImprovedContent(id)` → only `improvedContent` is cleared → AC-9
- [x] Set `OPENROUTER_API_KEY` to an invalid value and improve → the existing clear AI error; `content` and `improvedContent` unchanged → AC-11
- [ ] Signed in as user B, call `saveResumeContent`, `getResumeContent`, `improveResume`, `acceptImprovedContent`, `discardImprovedContent`, `getInterviews` with user A's resume id → "Unauthorized" each time, nothing written → AC-10
- [x] `getResumes()` result has no `content`, `contentText`, or `improvedContent` keys; `getResume()` has no raw `content` or `improvedContent` → security model

## Commands
- [x] `npx tsc --noEmit -p .` → no errors → all
- [x] `npm run lint` → clean → all
- [x] `npm run build` → succeeds → all
- [x] Query `information_schema.columns` → `Resume.content`/`improvedContent` are `jsonb`, `contentText` is `text`, `contentUpdatedAt` and `Analysis`/`Interview.sourceContentAt` are nullable timestamps → AC-5

## Acceptance-criteria coverage
- AC-1 create steps 1 and 2 · AC-2 save round trip · AC-3 the two validation steps · AC-4 corrupt content · AC-5 upload regression, schema query · AC-6 empty then filled analyze · AC-7 the three cache steps · AC-8 the three improve steps · AC-9 accept and discard · AC-10 the user B step · AC-11 AI failure · AC-12 detail page steps
