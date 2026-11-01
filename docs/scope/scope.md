# Scope: ATS Resume Checker

A web app that helps job seekers get past applicant tracking systems: analyze and improve resumes and cover letters, prepare for interviews, and now build and edit resumes in a section editor with AI help, under a free AI allowance with credits after that.

**Build approach:** Tracer Bullet (each feature runs end to end through page, server action, and database before the next one starts).
**Workflow:** Alpha (after `/develop`, run `/check verify` on the real app). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Auth (Google sign in) | Existing | existing |
| B | Resume upload & library | Existing | existing |
| C | ATS analysis & job match | Existing | existing |
| D | AI resume improvement | Existing | existing |
| E | Interview prep | Existing | existing |
| F | Cover letters | Existing | existing |
| G | Theme & UI kit (Amber Walnut) | Existing | existing |
| 1 | Structured resume data model | Foundation | in-progress |
| 2 | Resume maker: manual section editor | Slice 1 | in-progress |
| 3 | AI section writing | Slice 2 | in-progress |
| 4 | AI usage limit & credit balance | Slice 3 | in-progress |
| 5 | Pricing page (dummy) | Slice 3 | in-progress |
| 6 | Import an existing resume into the editor | Slice 4 | in-progress |
| 7 | PDF export | Slice 5 | in-progress |
| 8 | Resume viewer & ATS templates | Slice 5 | in-progress |
| 9 | Editor live preview | Slice 5 | in-progress |

## Already built

### A. Auth (Google sign in) · existing
Better Auth with Google sign in, session check in the dashboard layout. code in `lib/auth/`, `app/auth/`, `actions/auth.ts`

### B. Resume upload & library · existing
Upload PDF, DOCX, or TXT, store the extracted text, list, view, delete. code in `actions/resume.ts`, `lib/parser/`, `app/(dashboard)/resumes/`

### C. ATS analysis & job match · existing
Scored ATS analysis and resume to job description matching. code in `actions/analysis.ts`, `app/(dashboard)/analyze/`

### D. AI resume improvement · existing
AI rewrite of a whole uploaded resume as text. code in `actions/improve.ts`

### E. Interview prep · existing
AI interview questions from a resume. code in `actions/interview.ts`, `app/(dashboard)/interview/`

### F. Cover letters · existing
Upload, analyze, and improve cover letters. code in `actions/cover-letter.ts`, `app/(dashboard)/cover-letters/`

### G. Theme & UI kit (Amber Walnut) · existing
Theme tokens, light and dark mode, shared UI primitives every new page reuses. code in `app/globals.css`, `components/ui/`

## Foundations

### 1. Structured resume data model · in-progress
Store a resume as typed sections (contact, summary, experience, skills, education) instead of one text blob, so the editor, AI writing, import, and PDF export all share one shape.
**Done when:** a resume can be saved and loaded as sections without breaking existing uploaded resumes, analysis, or interview data.
spec [0001](../specs/0001-structured-resume-data-model/index.md) · code in `lib/resume/`, `actions/resume.ts`, `actions/improve.ts`, `lib/action-helpers.ts`
- [x] Design it (spec): `/architect structured resume data model`
- [x] Build it: `/develop structured resume data model`
  - [x] Schema columns, Zod content schema, and text renderer (AC-2, AC-3, AC-4, AC-5)
  - [x] Create, save, and load actions with owner checks (AC-1, AC-2, AC-3, AC-4, AC-10)
  - [x] AI actions read the new text, with cache freshness by content version (AC-5, AC-6, AC-7, AC-10)
  - [x] Structured improve draft with accept and discard, race safe (AC-8, AC-9, AC-11)
  - [x] Detail page shows sectioned text and drafts (AC-5, AC-12)
- [ ] Verify it: `/check verify structured resume data model`

## Slice 1: Resume maker core loop

### 2. Resume maker: manual section editor · in-progress
Create a new resume and fill each section by hand, save, and reopen it. Its own App Router routes (for example a new page and an edit page per resume) with a sidebar entry, in the existing theme. This is the thin thread every later slice thickens.
**Done when:** a signed in user can create a resume, add and reorder entries in each section, save, leave, and come back to the same content; other users cannot open it.
spec [0002](../specs/0002-resume-maker-section-editor/index.md) · code in `app/(dashboard)/resumes/new/`, `app/(dashboard)/resumes/[id]/edit/`, `components/resume/editor/`, `lib/resume/form.ts`, `actions/resume.ts`
- [x] Design it (spec): `/architect resume maker`
- [ ] Build it: `/develop resume maker`
  - [x] Version checked save, create flow, and a thin editor (title, contact, summary) end to end (AC-1, AC-4, AC-5, AC-7, AC-8, AC-12, AC-16)
  - [ ] Every section with add, remove, reorder, dates, skills, and optional sections, usable at phone width (AC-2, AC-3, AC-5, AC-6, AC-11) · code built; phone width and keyboard check (spec task 8) not yet done in a browser
  - [x] Leave guard and the AI draft banner with save confirm (AC-9, AC-10)
  - [x] List, dashboard, and detail page wiring: badges, Edit links, Accept/Discard, out of date marks (AC-1, AC-13, AC-14, AC-15)
- [ ] Verify it: `/check verify resume maker`

## Slice 2: AI writing

### 3. AI section writing · in-progress
Each section gets a "write with AI" and "rewrite with AI" action that fills or improves that section from what the user has entered, and the user can keep editing the result.
**Done when:** the user can generate or rewrite any one section, review it, accept or discard it, and the accepted text saves like a manual edit; AI errors show a clear message and leave the section unchanged.
spec [0003](../specs/0003-ai-section-writing/index.md) · code in `actions/section-writing.ts`, `lib/resume/section-writing.ts`, `lib/prompts/section-writing.ts`, `components/resume/editor/`
- [x] Design it (spec): `/architect AI section writing`
- [ ] Build it: `/develop AI section writing`
  - [x] Summary end to end: server action with checks, cooldown, nonce, and cleaning; suggestion panel with Accept, Try again, chips, target role box (AC-1, AC-4, AC-5, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13, AC-14)
  - [x] Bullets on every experience, education, and project entry, applied by entry id (AC-2, AC-10, AC-14)
  - [x] Skills suggestions that only add, with the merge and limits (AC-3, AC-14)
  - [ ] Preconditions, placeholder warning after save, phone width and keyboard check (AC-6, AC-12) · AC-6 and AC-12 built and checked in a browser, bullets fit at phone width; open AI panels at phone width and keyboard only (spec task 8) not yet checked
- [ ] Verify it: `/check verify AI section writing`

## Slice 3: Limits and credits

### 4. AI usage limit & credit balance · in-progress
Count AI resume writing uses per user (section writing and import; analysis, job match, interview, and cover letters stay free). The first 5 are free; after that each use needs a credit. Show the remaining balance in the maker.
**Done when:** the 6th AI writing use with no credits is blocked on the server with a message linking to the pricing page; the balance updates after each use; free features are never blocked.
spec [0004](../specs/0004-ai-usage-credit-balance/index.md) · code in `lib/ai/credits.ts`, `lib/ai/credits-shared.ts`, `actions/credits.ts`, `actions/section-writing.ts`, `components/resume/editor/`, `scripts/grant-credits.mjs`, `prisma/schema.prisma`
- [x] Design it (spec): `/architect AI usage limit & credit balance`
- [x] Build it: `/develop AI usage limit & credit balance`
  - [x] Schema, free use reserve in `writeResumeSection`, and the balance line end to end (AC-1, AC-3, AC-4, AC-5, AC-7, AC-10, AC-11, AC-12)
  - [x] Refunds on failed AI steps and credit spending (AC-1, AC-2, AC-5)
  - [x] Low balance warning and the out of uses state on buttons and panel (AC-3, AC-8, AC-9)
  - [x] Credit grant script (AC-5, AC-6)
- [ ] Verify it: `/check verify AI usage limit & credit balance`

### 5. Pricing page (dummy) · in-progress
A pricing page in the same Amber Walnut style listing credit packs. For now Buy does not charge or add credits; it shows a "coming soon" message.
**Done when:** the page is reachable from the sidebar and from the limit message, shows plans and prices in both light and dark mode, and Buy shows the coming soon notice without changing the balance.
spec [0005](../specs/0005-pricing-page/index.md) · code in `app/(dashboard)/pricing/`, `components/pricing/`, `lib/pricing/packs.ts`, `lib/ai/credits-shared.ts`, `components/ui/sidebar.tsx`, `components/ui/dialog.tsx`
- [x] Design it (spec): `/architect pricing page`
- [x] Build it: `/develop pricing page`
  - [x] Route, sidebar entry, and pack cards from `CREDIT_PACKS`, so every "See pricing" link works (AC-1, AC-2, AC-3, AC-5)
  - [x] Buy coming soon dialog (AC-6)
  - [x] Balance card with the shared `balanceLabel`, the explainer, and the FAQ (AC-4, AC-7, AC-8)
  - [x] Light, dark, phone, and desktop checks (AC-9)
- [ ] Verify it: `/check verify pricing page`

## Slice 4: Editing existing resumes

### 6. Import an existing resume into the editor · in-progress
Open an uploaded resume in the section editor: AI splits its text into sections (counts as one AI use), then the user edits and saves it like any other resume.
**Done when:** from a resume's detail page the user can open it in the editor with sections filled from the uploaded text, edit, and save; the original upload stays intact.
spec [0006](../specs/0006-import-resume-into-editor/index.md) · code in `actions/resume-import.ts`, `lib/resume/import.ts`, `lib/prompts/resume-import.ts`, `lib/ai/client.ts`, `components/resume/import-resume-button.tsx`, `components/resume/editor/import-notice.tsx`, `prisma/schema.prisma`, `actions/resume.ts`, `app/(dashboard)/resumes/[id]/`, `components/resume/resume-list.tsx`, `components/resume/editor/resume-editor.tsx`, `components/ui/dialog.tsx`, `types/index.ts`
- [x] Design it (spec): `/architect import resume into editor`
- [x] Build it: `/develop import resume into editor`
  - [x] Schema, `callAI` options, and the cleaner (AC-4, AC-5, AC-6, AC-7, AC-16)
  - [x] `importResume` with charge and refund, plus the detail page button opening the editor end to end (AC-1, AC-2, AC-3, AC-10, AC-11, AC-12, AC-13)
  - [x] Editor import notice and Dismiss (AC-8)
  - [x] Import again, "Imported from" line, edit page and list entry points (AC-1, AC-9, AC-14, AC-15)
- [ ] Verify it: `/check verify import resume into editor`

## Slice 5: View and export

### 8. Resume viewer & ATS templates · in-progress
Show every built or imported resume as real A4 pages instead of plain text (one page when it fits, page 2 when it does not, a warning past 2), and let the user pick from several ATS friendly templates. Uploads keep their text view with the "Open in editor" button.
**Done when:** a built resume's page shows it laid out as a resume in the chosen template, the user can switch between at least two ATS friendly templates and the choice is remembered, and the text stays selectable and in section order.
spec [0007](../specs/0007-resume-viewer-ats-templates/index.md) · code in `components/resume/viewer/`, `lib/resume/templates.ts`, `lib/resume/format.ts`, `lib/resume/paginate.ts`, `actions/resume.ts`
- [x] Design it (spec): `/architect resume viewer & ATS templates`
- [ ] Build it: `/develop resume viewer & ATS templates`
  - [x] Columns, registry, and the Classic sheet on the detail page with the saved template picker (AC-1, AC-2, AC-3, AC-5, AC-6, AC-7, AC-9, AC-11, AC-12, AC-13, AC-14)
  - [x] Modern and Compact templates, plus the link style picker (AC-2, AC-4, AC-11)
  - [x] Draft as a second sheet, A4 pagination with the over two pages warning, and the edge states (AC-8, AC-10, AC-13 to AC-19)
  - [ ] Light, dark, phone, and desktop checks against the A4 Figma frames (AC-1 to AC-19)
- [ ] Verify it: `/check verify resume viewer & ATS templates`

### 7. PDF export · in-progress
Download a resume from the editor as a clean, single column, ATS friendly PDF.
**Done when:** the user can download a PDF whose text is selectable and in section order, and it matches what the editor shows.
spec [0008](../specs/0008-pdf-export/index.md) · code in `components/resume/viewer/pdf-download-button.tsx`, `components/resume/viewer/paginated-sheet.tsx`, `components/resume/viewer/use-print-title.ts`, `app/globals.css`
- [x] Design it (spec): `/architect PDF export`
- [ ] Build it: `/develop PDF export`
  - [x] Print path end to end: print copy of the measured pages, print stylesheet, and the file name (AC-2, AC-3, AC-6, AC-10, AC-11)
  - [x] Download PDF button with its tip, the preparing, saving, and empty states, and the placeholder confirm (AC-1, AC-4, AC-5, AC-7, AC-8, AC-9, AC-12)
  - [ ] Cross browser print checks against the viewer: Chrome, Edge, Firefox, Safari, light, dark, phone (AC-1 to AC-12)
- [ ] Verify it: `/check verify PDF export`

### 9. Editor live preview · in-progress
Show the ATS sheet inside the editor, following unsaved edits as you type: beside the form on wide screens, behind an Edit / Preview switch on phones, with Template and Links pickers that save at once.
**Done when:** typing in the editor updates the sheet within about 300 ms (even with invalid input), the layout works at phone and desktop widths, and a template or link pick saves without marking the form dirty or causing a save conflict.
spec [0009](../specs/0009-editor-live-preview/index.md) · code in `components/resume/editor/`, `components/resume/viewer/choices.tsx`, `lib/resume/form.ts`, `actions/resume.ts` · from spec 0007
- [x] Design it (spec): `/architect editor live preview`
- [ ] Build it: `/develop editor live preview`
  - [x] Loader fields and the side by side preview fed by the debounced form, with fonts and the error boundary (AC-1, AC-3, AC-10, AC-11, AC-14, AC-16)
  - [x] Lenient preview content and safe links (AC-4, AC-15)
  - [x] Shared choices file, compact Template and Links pickers saving at once (AC-5, AC-6, AC-7, AC-12, AC-13)
  - [x] Phone Edit / Preview tabs, the over 2 pages warning, and the exclusions (AC-2, AC-8, AC-9, AC-13)
  - [ ] Light, dark, phone, tablet, desktop, and slow CPU checks (AC-1 to AC-16)
- [x] Verify it: `/check verify editor live preview`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Real payments**: Buy charges and adds credits to the balance · needs a decision · GA
- **Credit history**: a list of credits bought and used · needs a decision
- **One click PDF download**: a real file without the print dialog (server side rendering of the same sheet) · needs a decision · from spec 0008
cl
## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA) |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is**; `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; for Alpha, after `/check verify` is the suggested point to call it done |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (built before this workflow) and `dropped` (taken out of scope, kept for history).
- **Approach tag** beside a heading overrides the project default for that feature; no tag means it inherits.
- **Workflow tier tag** beside a heading (e.g. `· GA`) sets that one feature's rigor; no tag inherits the default. **Prototype** = nothing after develop; **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
