# Verify: Resume maker (manual section editor) · spec 0002 · updated 2026-10-30
_Steps derived from spec 0002 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones. You need two accounts (A and B), one resume uploaded as a file by A, and the dev server (`npm run dev`)._

## UI / manual

### Create and save (thin thread)
- [ ] As A, click "Resume Maker" in the sidebar → `/resumes/new`, only "Resume Maker" is highlighted (not "Resumes") → AC-1
- [ ] Submit an empty title, then a title of only spaces → "Title is required" under the field, no network call to create, no new row → AC-1
- [ ] Submit "Frontend 2026" → redirected to `/resumes/<id>/edit`; contact shows A's account name and email → AC-1
- [ ] `/resumes` has a "New resume" button that opens `/resumes/new` → AC-1
- [ ] On a fresh editor the Save button is disabled and there is no status text → AC-4
- [ ] Type a summary → status "Unsaved changes", Save enabled; press Save → "Saving..." then "Saved", Save disabled again → AC-4
- [ ] Type a summary with leading and trailing spaces, save → the form now shows it trimmed (values replaced by what the server stored) → AC-4
- [ ] Reload the page → identical title and content → AC-4
- [ ] Rename the title in the sticky bar and save → `/resumes` and the detail page show the new title → AC-4

### Sections, reorder, caps
- [ ] Contact, Summary, Experience, Education, Skills show; Projects, Certifications, Languages do not (new resume) and are offered under "Add section" → AC-2
- [ ] Add two experience entries with bullets, move the second up, move a bullet down; the first item's "move up" and the last item's "move down" are disabled → AC-3
- [ ] Save and reload → new order kept; in Prisma Studio the entry and bullet ids are unchanged, only order moved → AC-3, AC-4
- [ ] Clicking "Add experience" focuses the new entry's Job title field; new entries go at the end → AC-3
- [ ] Add 12 bullets to one entry → "Add bullet" disabled with "Limit reached: at most 12 bullets per entry." (same for 10 links) → AC-3
- [ ] Shrink the window to phone width (about 375px) → no sideways scrolling, sticky bar wraps, all controls reachable → AC-2
- [ ] Keyboard only: Tab through an entry, use move and remove buttons with Enter/Space; screen reader reads "Move <job title, company> up" → AC-3

### Validation
- [ ] Add an experience entry, focus Job title, then tab away → "Required" appears on blur → AC-5
- [ ] Leave it blank and press Save → no `saveResumeContent` request in the network tab, focus jumps to the first invalid field → AC-5
- [ ] Skills box "React, TypeScript, , Node" → saved row has `["React","TypeScript","Node"]` → AC-5
- [ ] Skills box ", ," → "Required" on that box → AC-5
- [ ] A skill longer than 60 characters → error reads "Item N: Too big…" naming the item → AC-5
- [ ] Link URL `javascript:alert(1)` → "Must be an http or https URL" on the URL field → AC-5
- [ ] With the job title filled, set End before Start → "Must not be before start" on End → AC-5

### Dates
- [ ] Set an End date, then check "I currently work here" → End clears and is disabled; save; the stored entry has `current: true` and no `end` → AC-6
- [ ] Start/End are month pickers (Chrome/Edge) and save as `YYYY-MM` → AC-6

### Errors and conflicts
- [ ] Go offline (DevTools) and press Save → banner "Could not reach the server…", edits stay, status still "Unsaved changes" → AC-7
- [ ] Open the editor in two tabs; save in tab 1; edit and save in tab 2 → tab 2 shows "This resume changed elsewhere. Reload to get the latest." with Reload; the row holds tab 1's content → AC-8
- [ ] In tab 2 press Reload → form shows tab 1's content, no browser leave prompt, saving now works → AC-8
- [ ] Lost response check: save, then save the same content again from a second tab that loaded before → editor treats a conflict whose stored content equals the form as saved ("Saved") → AC-8

### Leave guard
- [ ] With unsaved edits, click the Dashboard sidebar link → confirm "You have unsaved changes. Leave without saving?"; Cancel stays with edits, OK leaves → AC-9
- [ ] With unsaved edits, reload the tab → browser leave prompt → AC-9
- [ ] With no unsaved edits (or right after Save) → no prompts on links or reload → AC-9

### AI draft
- [ ] On a built resume with a summary or bullets, run "Improve Resume" on the detail page, then open the editor → banner "An AI improvement is waiting. Saving discards it." with a link back → AC-10
- [ ] Edit and press Save → dialog "Discard the AI improvement?"; Cancel sends nothing; "Save and discard draft" saves and the banner disappears; a second save in the same visit does not ask → AC-10
- [ ] Detail page no longer shows the draft after that save → AC-10

### Optional sections
- [ ] "Add section" → Projects appears, scrolls into view; add then remove its only entry → section stays, empty; reload → gone → AC-11
- [ ] Projects with one entry → "Remove section" asks first; confirm → section hidden, form unsaved until Save → AC-11

### Upload, corrupt, not found
- [ ] As A, open `/resumes/<uploaded id>/edit` → "This resume was uploaded as a file. Opening it in the editor comes with import." plus "Back to resume", no form → AC-12
- [ ] Corrupt `content` of a built resume in Prisma Studio (e.g. set `schemaVersion` to 9), open its editor → "This resume's sections could not be read", no form, row unchanged → AC-12
- [ ] Open `/resumes/does-not-exist/edit` → not found page → AC-12

### Lists and detail page
- [ ] `/resumes`: the built resume shows "Built" and an Edit link; the uploaded one shows "Uploaded" and no Edit link → AC-13
- [ ] Dashboard recent activity shows the same Built/Uploaded badges → AC-13
- [ ] Detail page of the built resume: "Created <date>", "Built" badge, "Edit resume" button; uploaded resume: "Uploaded <date>", no Edit → AC-13
- [ ] Run Improve on the built resume → improved panel shows "Accept improvement" and "Discard" → AC-14
- [ ] Accept → toast, page refreshes, resume text now shows the improved text, no draft → AC-14
- [ ] Run Improve, then Discard → draft gone, resume text unchanged → AC-14
- [ ] Run Improve, change the resume in the editor in another tab and save, then press Accept on the stale detail page → toast "Resume changed, try again" or "No improvement draft to apply", nothing changes → AC-14
- [ ] Run ATS analysis on the built resume, then edit and save → detail page shows "Out of date, run again" on the score card and "Run ATS Analysis" is offered again → AC-15
- [ ] Same for interview questions → badge on the Interview Questions panel and the button returns → AC-15
- [ ] On an uploaded resume with analysis and interview → no out of date badge ever → AC-15

### Ownership
- [ ] As B, open A's `/resumes/<id>/edit` → not found page → AC-16
- [ ] As B, call `saveResumeContent` with A's id (from a dev console or temporary script) → "Unauthorized" or "Resume not found", A's row unchanged → AC-16

## Value sourcing checks
- [ ] Edit page initial values come from `getResumeContent` (`title`, `content`, `contentUpdatedAt`, `hasDraft`): change the title in Prisma Studio, reload → editor shows it → AC-4
- [ ] `hasDraft` counts a corrupt draft: corrupt `improvedContent` in Prisma Studio → the editor banner still shows (detail page cannot offer Accept/Discard; saving clears it) → AC-10
- [ ] `toContent` always sends `schemaVersion: 1`: the saved row's `content.schemaVersion` is 1 → AC-4
- [ ] Title rule is `titleSchema` everywhere: a 201 character title is rejected on create and in the editor → AC-1, AC-5
- [ ] `expectedUpdatedAt` is the loaded/last saved version: two saves in a row from one tab both succeed (version updates after each save) → AC-8
- [ ] The stored write is conditional: after a conflict the row's `contentUpdatedAt` equals the other tab's save, not a new value → AC-8
- [ ] New entry and link ids come from `crypto.randomUUID()`: ids in the saved row are UUIDs and all unique → AC-3
- [ ] Built badge = `contentUpdatedAt !== null`: an uploaded resume (null) shows "Uploaded" everywhere → AC-13
- [ ] Out of date = latest `sourceContentAt` vs `contentUpdatedAt` by time: right after a fresh analysis, no badge; after a save, badge → AC-15
- [ ] Optional section visibility is page state only: no new column or field is written when sections are shown or hidden → AC-2, AC-11

## Commands
- [x] `npx tsc --noEmit -p .` → no errors
- [x] `npm run lint` → clean
- [x] `npm run build` → compiles; routes `/resumes/new` and `/resumes/[id]/edit` listed (Better Auth `headers()` notes are pre-existing)

## Acceptance-criteria coverage
- AC-1 create flow and sidebar · AC-2 section layout, phone width · AC-3 add/remove/move, caps, ids · AC-4 save, status, reload · AC-5 validation · AC-6 dates · AC-7 server errors · AC-8 conflicts and lost response · AC-9 leave guard · AC-10 draft banner and confirm · AC-11 optional sections · AC-12 upload, corrupt, not found · AC-13 badges and Edit links · AC-14 Accept/Discard · AC-15 out of date · AC-16 ownership
