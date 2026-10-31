# 0008. PDF export: the browser prints the viewer's measured A4 pages through a print stylesheet

**Date**: 2026-10-31
**Status**: In Progress

## Summary

A built resume's detail page gets a "Download PDF" button above its A4 pages. Clicking it opens the browser's print dialog on a clean copy of exactly the pages the viewer shows (same template, link style, and page breaks), and you choose Save as PDF. No server work, no new package, and no database change: the browser turns the same HTML into a PDF with real, selectable text. Before printing, a short confirm appears if `[placeholders]` like `[X%]` are still in the resume, and the suggested file name is your name plus "Resume".

## Requirements

**User stories**:
- As a job seeker, I want to download my built resume as a PDF so that I can send it to employers and upload it to job sites.
- As a job seeker, I want the PDF to look exactly like the pages I see so that there are no surprises after I send it.
- As a job seeker, I want a warning when placeholders like `[X%]` are still in my resume so that I never send one to an employer by mistake.

**Acceptance criteria**:
- **AC-1**: On `/resumes/[id]`, a built resume whose sections can be read (the spec 0007 viewer) shows a "Download PDF" button in the "Your Resume" card, above the pages, with this tip line under it: "Choose Save as PDF in the print dialog. Turn off Headers and footers if you see them." An uploaded resume, a resume whose sections cannot be read (spec 0007 AC-14), the editor, and the "Improved Resume" draft card show no such button.
- **AC-2**: Clicking the button (with no placeholders left, see AC-7) opens the browser print dialog. The printed result is exactly the viewer's saved sheet: same template, same link style, same number of pages, and the same blocks on each page, one A4 sheet of paper per viewer page, with no blank trailing page. Nothing else from the app prints (no sidebar, header, cards, pickers, warnings, draft sheet, "Page N of M" labels, page shadow, or placeholder highlight).
- **AC-3**: In the saved PDF the text is real text: selectable and copyable, and it reads in section order (Contact, Summary, Experience, Education, Skills, Projects, Certifications, Languages). Contact links, project URLs, and certification URLs are real links in the page, so browsers that keep links in printed PDFs (Chrome, Edge, Firefox) make them clickable.
- **AC-4**: The PDF always shows the last saved sections in the saved template and link style. While a template or link style save is in flight, the button is disabled and reads "Saving…". It turns back to "Download PDF" when the save settles; if the save failed and the picker went back (spec 0007 AC-11), the PDF uses the reverted, saved value.
- **AC-5**: The button is disabled and reads "Preparing pages…" until the viewer has measured its pages after the fonts load (spec 0007 AC-19), so a PDF is never printed from the unmeasured single page fallback.
- **AC-6**: The print dialog's suggested file name and the PDF's title are `<full name> Resume` (for example `Jane Doe Resume.pdf`), from the saved `contact.fullName`, with the characters `\ / : * ? " < > |` removed, runs of spaces collapsed to one, trimmed, and cut to 100 characters. This applies to every print of the page (button, Ctrl+P, or the browser menu). The browser tab title goes back to what it was when the dialog closes, whether you saved or cancelled.
- **AC-7**: When the text the sheet prints contains placeholders (the spec 0003 pattern, for example `[X%]` or `[Company]`), clicking the button first opens a dialog instead of printing. Title: "1 placeholder is still in your resume" or "N placeholders are still in your resume". Body: "Placeholders print exactly as written, brackets included. Replace them in the editor, or download anyway." Buttons: "Edit resume" (goes to `/resumes/[id]/edit`) and "Download anyway" (closes the dialog and opens the print dialog). Escape, the close button, or a click outside closes it and prints nothing. The count covers every text field the sheet prints (contact, summary, titles, companies, locations, schools, degrees, fields, bullets, skill categories and items, project names and roles, certification names and issuers, languages and proficiencies, and link labels when the link style shows labels), not only the summary, bullets, and skills.
- **AC-8**: A resume that runs past 2 pages can still be downloaded; the spec 0007 "runs past 2 pages" warning stays on screen and is not printed.
- **AC-9**: A built resume with no summary and no entries has the button disabled; the existing spec 0007 hint "This resume has no sections yet. Add them in the editor" explains why.
- **AC-10**: Pressing Ctrl+P (or Cmd+P, or the browser's own Print menu) on a built resume's detail page prints the same clean pages as the button, with the AC-6 file name. This path skips the AC-7 confirm (the app cannot intercept it).
- **AC-11**: The PDF is the same in dark mode and on a phone as in light mode on a desktop: white paper and dark ink at full A4 size, with the same page breaks. The on screen scaling of spec 0007 AC-10 never reaches print.
- **AC-12**: Downloading makes no server request, uses no AI credit, and writes nothing to the database.

## Decision

**Chosen option**: Option 1: Browser print of the viewer's measured pages through a print stylesheet on the detail page.

The saved sheet's `PaginatedSheet` also renders a print only copy of its measured pages into a portal on `document.body`; a `@media print` stylesheet hides everything else and prints each page as one A4 sheet, and a client `PdfDownloadButton` in the viewer runs the placeholder confirm and calls `window.print()`.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: none. No table or column changes, no migration. Downloads are not recorded (the browser cannot tell the app whether the file was saved or the dialog was cancelled, so any record would be unreliable).

**State transitions**: the button only.
`preparing` (pages not measured yet) → `ready` → on click: `confirming` (placeholders found) → `ready` (closed) or `printing` (Download anyway); or straight to `printing` (no placeholders) → `ready` after the dialog closes. From any state, a template or link style save in flight shows `saving` until it settles. An empty resume is `disabled` throughout.

**Interface surface** (client only; no server action, route, or endpoint is added):

| Piece | File | Inputs | Output / effect | Notes |
|---|---|---|---|---|
| `PaginatedSheet` (changed) | `components/resume/viewer/paginated-sheet.tsx` | new optional `printable?: boolean` | When `printable` and the pages are measured, also renders a print copy through `createPortal` into `document.body`: a `<div data-print-root>` carrying `sheetFontVariables`, holding one `<article data-print-page>` per measured page with the same block indexes as the screen pages, blocks rebuilt with `highlight: false` | Only the saved sheet passes `printable`; the draft sheet never does. Hidden on screen (`hidden print:block`) |
| `ResumeViewer` (changed) | `components/resume/viewer/resume-viewer.tsx` | existing props | Renders `PdfDownloadButton` under the pickers; passes `printable` to the saved `ResumeSheet`; tracks the saved sheet's page count as `number \| null` (null until first measured) | `useSavedChoice` also returns `pending: boolean` (true while the newest save for that setting is in flight) |
| `ResumeSheet` (changed) | `components/resume/viewer/resume-sheet.tsx` | new optional `printable` | passes it through to `PaginatedSheet` | |
| `PdfDownloadButton` (new) | `components/resume/viewer/pdf-download-button.tsx` | `resumeId`, `ready: boolean`, `saving: boolean`, `hasBody: boolean`, `placeholderCount: number` | The button, the tip line, the AC-7 `Dialog` (`components/ui/dialog.tsx`), and `window.print()` | Disabled when `!hasBody`, `!ready`, or `saving`; label by AC-4 and AC-5 |
| `usePrintTitle` (new) | `components/resume/viewer/use-print-title.ts` | `title: string` | On `beforeprint`, saves `document.title` and sets it to `title`; on `afterprint`, restores it | Mounted by the viewer, so it covers the button and Ctrl+P (AC-6, AC-10) |
| `pdfFileTitle` (new) | `lib/resume/format.ts` | `fullName: string` | `"<cleaned name> Resume"` by the AC-6 rules | Pure |
| `countSheetPlaceholders` (new) | `lib/resume/placeholders.ts` | `content: ResumeContent`, `linkStyle: LinkStyle` | number of `PLACEHOLDER_PATTERN` matches across every field the sheet prints (AC-7 list); link labels count only when `linkStyle` is `label` or `both`; URLs never count | Pure. The existing `countPlaceholders` (editor) is unchanged |
| Print stylesheet (new) | `app/globals.css` | none | See *Print layout* below | |

**Print layout** (`app/globals.css`, `@media print`):
- `@page { size: A4; margin: 0; }` (zero margins also stop Chrome and Edge from printing their date and URL headers).
- `html`, `body`: background `var(--sheet-paper)`, no padding or margin.
- `body:has(> [data-print-root]) > :not([data-print-root]) { display: none !important; }` hides the whole app, so the portal copy is the only thing printed. On pages without a print root (uploads, other pages) nothing changes.
- `[data-print-page]`: `width: 794px; height: 1122px; padding: <template margin>; overflow: visible; box-shadow: none; transform: none; break-after: page;` and `[data-print-page]:last-child { break-after: auto; }`. The height is 1122 px, not 1123 px, because A4 is 1122.5 px at 96 px per inch and a page box a fraction too tall makes browsers add a blank page. Pagination itself still uses the 1123 px page from spec 0007; content never reaches the last pixel because the bottom margin is at least 48 px.
- The first block on each print page drops its top padding, the same rule as the screen pages (`[&>*:first-child>*]:pt-0`).

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| button | whether it shows at all | the spec 0007 viewer renders it, so only when `getResume().content !== null` (built and readable) |
| button | disabled because empty | `hasResumeBody(content)` (spec 0001) |
| button | disabled while preparing | the saved sheet's page count is still `null` (no `onPageCount` yet from `PaginatedSheet`) |
| button | disabled while saving | `pending` from `useSavedChoice` for template or link style |
| button | label text | fixed strings: "Download PDF", "Preparing pages…", "Saving…" |
| tip line | text | fixed string in AC-1 |
| confirm dialog | whether it opens, and N | `countSheetPlaceholders(content, shownLinkStyle)` over the saved `content` (spec 0003 `PLACEHOLDER_PATTERN`) |
| confirm dialog | "Edit resume" link | `/resumes/${resumeId}/edit` from the `resumeId` prop |
| print copy | sections and text | the same saved `content` the viewer shows (`Resume.content`, parsed by `getResume`) |
| print copy | template and link style | the viewer's `shown` values, which equal the saved values whenever the button is enabled (AC-4) |
| print copy | which blocks go on which page | the screen sheet's measured `pages` from `paginate` (spec 0007), reused as is, never measured again |
| print copy | highlight | always `false` |
| print copy | fonts | `sheetFontVariables` from `lib/resume/fonts.ts`, put on the portal root (it sits outside the viewer root) |
| print copy | paper and ink colors | `--sheet-*` tokens (spec 0007), not redefined in dark mode |
| print page | paper size and margins | `@page { size: A4; margin: 0 }`; the template's `margin` as page padding |
| file name and PDF title | `<full name> Resume` | `pdfFileTitle(content.contact.fullName)`, set as `document.title` by `usePrintTitle` on `beforeprint` |
| file name and PDF title | restore after print | the `document.title` value saved on `beforeprint` |

**Key invariants**:
- The PDF is the saved sheet: printed page count and the blocks on each page always equal the viewer's measured pages. The print copy reuses the screen `pages` array; it never paginates on its own.
- Turning the highlight off can only make a block the same size or smaller (the `<mark>` padding goes away), so reusing the highlighted measurement never makes a printed page overflow.
- Print never scales: printed pages are 794 px wide at scale 1, whatever the screen width.
- Only the saved sheet is ever printable. The draft sheet and every other part of the app are hidden in print.
- Downloading never touches the server or the database.
- All printed text is React text from the stored content (no raw HTML), the same as the viewer.

**Security model**:
- No new data path: the page is already owner only (`getResume` filters by `userId`), and printing uses only what that page already loaded.
- No third party: the PDF is made by the user's own browser; nothing is uploaded anywhere.
- Links in the PDF are the same http and https links the viewer shows (spec 0001 schema rejects other schemes).
- No compliance scope beyond what the resume page already has.

**Configuration required**: none. No env vars, no new packages.

**Critical test scenarios**:
- Happy path: on a built 1 page Classic resume with no placeholders, click Download PDF, pick Save as PDF; the file is named `Jane Doe Resume.pdf`, has 1 page, looks like the viewer, and its text copies out in section order; a link opens, verifies **AC-1**, **AC-2**, **AC-3**, **AC-6**.
- Match: a 2 page Compact resume prints as 2 sheets with the same first and last block on each page as the viewer and no blank third page, in Chrome, Edge, Firefox, and Safari, verifies **AC-2**, **AC-11**.
- Text check: run the saved PDF through `pdf-parse` (already a dependency); the text contains every section heading in order, verifies **AC-3**.
- Placeholders: an imported copy with `[Company]` in an experience entry shows "1 placeholder is still in your resume"; "Edit resume" opens the editor; "Download anyway" opens print; Escape prints nothing, verifies **AC-7**.
- Saving and preparing: switch template and click at once; the button reads "Saving…" until the save lands; go offline, switch template, the picker reverts, and the PDF uses the reverted template; on a cold load the button reads "Preparing pages…" until the pages appear, verifies **AC-4**, **AC-5**.
- Ctrl+P and dark mode: in dark mode at 360 px width, press Ctrl+P; the preview shows the same white A4 pages and file name as the button on desktop, verifies **AC-10**, **AC-11**.
- Edge states: a 3 page resume downloads and its warning is not printed; an empty resume has the button disabled; an upload and an unreadable resume show no button; the draft card has none, verifies **AC-1**, **AC-8**, **AC-9**.
- No server: with the network panel open, clicking Download PDF and printing sends no request, verifies **AC-12**.

## Build plan

Tracer Bullet: task 1 runs the whole print path end to end (portal copy, print stylesheet, file name) so a real PDF comes out of the real page first; tasks 2 and 3 add the button and its rules; task 4 checks it across browsers.

1. Add `printable` to `PaginatedSheet` and `ResumeSheet` (the portal print copy with `highlight: false`, `data-print-root`, `data-print-page`, and `sheetFontVariables`); pass it for the saved sheet only; add the `@media print` rules and `@page` to `app/globals.css`; add `pdfFileTitle` and `usePrintTitle` and mount the hook in `ResumeViewer`. Check with Ctrl+P that the print preview matches the viewer, satisfies **AC-2**, **AC-3**, **AC-6**, **AC-10**, **AC-11**.
2. Add `pending` to `useSavedChoice`, track the saved sheet's page count as `number | null`, and add `PdfDownloadButton` with its tip line and the preparing, saving, and empty states, calling `window.print()`, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-8**, **AC-9**, **AC-12**.
3. Add `countSheetPlaceholders` and the confirm `Dialog` with "Edit resume" and "Download anyway", satisfies **AC-7**.
4. Run `npm run lint` and `npm run build`; print 1, 2, and 3 page resumes in all three templates from Chrome, Edge, Firefox, and Safari (or iOS Safari), in light and dark mode and at phone width; compare page counts and breaks with the viewer; check file names, links, and `pdf-parse` text order; run the critical test scenarios, satisfies **AC-1** to **AC-12**.

## Consequences

**Positive**:
- The PDF is the viewer by construction: one renderer, one pagination, so the two can never drift apart (spec 0007's main promise holds through to the file).
- No new package, no server route, no cold starts, no hosting cost, and no resume data sent anywhere.
- Ctrl+P on the page gives a clean resume for free, so "print to paper" works too.

**Negative / tradeoffs**:
- It is not a one click file: you go through the print dialog and pick Save as PDF. Some people will print to paper or pick the wrong destination by mistake; the tip line is the only guidance.
- The app cannot control everything in the dialog. Firefox and Safari may add a date and URL header unless the user turns Headers and footers off, and a user can change paper size or scale and get a different PDF.
- PDF quality depends on the browser. Chrome, Edge, and Firefox keep links clickable; Safari's handling of links and file names is less consistent.
- The app cannot know whether a PDF was actually saved, so there is no download count or "last downloaded" date.
- Ctrl+P skips the placeholder confirm.
- The detail page renders the saved sheet three times (screen pages, the measuring box, and the print copy). Resumes are small, so this is fine, but it is more DOM.
- A future server side feature (emailing a PDF, a public share link with a PDF) cannot reuse this path; it would need a server renderer.

**Neutral**:
- The print stylesheet lives in `app/globals.css` and only acts on pages that mount a `[data-print-root]`, so other pages print as before.
- The scope row's original wording ("from the editor", "matches what the editor shows") is replaced by the detail page viewer, because the A4 pages and the template picker live there since spec 0007.

## Follow-up

- [ ] Scope: update feature 7's intent and Done when to the detail page viewer (this spec's AC-1 and AC-2), replacing "from the editor".
- [ ] `/sync` after the build: note in root `AGENTS.md` that PDF export is browser print of the viewer (no PDF library), and that `[data-print-root]` is the print hook.
- [ ] If people find the print dialog confusing, a one click download (server side headless Chromium rendering the same sheet) is the next step; it would be a new spec that supersedes this decision.
- [ ] Spec 0007's follow-up "PDF export should reuse `ResumeSheet` … and print the same page breaks" is satisfied by this spec once built.
