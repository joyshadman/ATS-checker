# 0008. PDF export: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md` and skips this file.

## Context

> ⚠️ Premise note: the scope row asks for a PDF "from the editor" that "matches what the editor shows". Since spec 0007, the editor has no page preview; the A4 pages, the template, and the link style live on the resume detail page. A PDF made from the editor would be made from something you cannot see. This spec puts the download where the pages are, and the scope row should be reworded to match (Follow-up in `index.md`). A second note: "download" here means the browser's print dialog with Save as PDF, not a one click file, because of the decision below. That tradeoff is stated plainly in the Consequences.

People build their resume in the section editor (spec 0002) and see it as A4 pages in one of three ATS friendly templates on the detail page (spec 0007). The last step, getting a file to send to an employer or upload to a job site, is missing. Without it, the product stops short of its job: a resume that cannot leave the app is not useful.

The PDF has hard requirements. ATS software reads the text layer of a PDF, so the text must be real text (not an image), in reading order. The PDF must look exactly like the pages the viewer shows, including where pages break, or the preview loses its point. Spec 0007 already made the React templates the single source of the look and chose to measure page breaks in the browser, and it asked that PDF export reuse that renderer and those breaks instead of building a second one.

The forces on the how: the project runs on Next.js with server actions, likely hosted on a serverless platform (the auth URL logic detects Vercel), with free AI models and no paid infrastructure. The team is small. Any server side PDF renderer means a large dependency and cold starts on serverless functions; any second renderer means three templates kept in step twice. Resume data is personal, so sending it to a third party PDF service needs a strong reason.

## Options considered

### Option 1: Browser print of the viewer's pages (print stylesheet on the detail page)

The saved sheet renders a print only copy of its already measured pages; a print stylesheet hides the app and prints each page as one A4 sheet. A button runs a placeholder check and calls `window.print()`; the user picks Save as PDF.

**Pros**:
- Exact match by construction: the same DOM, fonts, and page assignment the viewer shows.
- Real selectable text and real links, made by the browser's own PDF engine.
- Zero new packages, no server route, no hosting cost, no data leaves the browser.
- Ctrl+P on the page also prints the clean resume.

**Cons**:
- Not one click: the user goes through the print dialog and must choose Save as PDF.
- The app cannot control the dialog: headers and footers in Firefox and Safari, paper size, and scale are the user's.
- The app cannot know whether a file was saved.
- Output differs a little between browsers (link handling, file name).

### Option 2: Server side headless Chromium

A route handler loads the resume, renders the same sheet HTML in headless Chromium (for example `puppeteer-core` with a serverless Chromium build), and returns a real PDF file.

**Pros**:
- True one click download with a fixed file name.
- Same rendering engine for everyone, so the output is consistent and controlled (no headers, fixed A4).
- Reusable later for server features (email a PDF, share link).

**Cons**:
- A large dependency (tens of MB) inside serverless function size limits, plus 3 to 8 second cold starts.
- Pagination must run again in the headless browser (measure after fonts load), a second place to keep correct.
- Auth must be carried into the headless page (or the HTML rendered as a string), more moving parts to secure.
- Ongoing operational cost and a new failure mode (Chromium crashes, timeouts) for a small team.

### Option 3: `@react-pdf/renderer`

Rebuild the three templates as `@react-pdf/renderer` documents and generate the PDF on the client or server.

**Pros**:
- Real file, one click, no browser print dialog and no headless browser.
- Embeds fonts and gives full control of the PDF.

**Cons**:
- A second copy of all three templates in a different layout system, which drifts from the viewer.
- Its own page breaking, so the PDF's breaks will not match the viewer's.
- Breaks spec 0007's single renderer decision.

### Option 4: Client side screenshot to PDF (html2canvas plus jsPDF)

Capture the pages as images in the browser and wrap them in a PDF.

**Pros**:
- One click file with no server.
- Looks exactly like the screen.

**Cons**:
- The text is an image: not selectable, not readable by ATS software. This fails the core requirement, so it is ruled out.

## Rationale

The deciding force is spec 0007's promise that the template components are the one source of the look and that page breaks are measured in the browser. Option 1 is the only option that keeps a single renderer and a single pagination all the way to the file: the print copy reuses the exact `pages` array the viewer computed, so the PDF cannot drift from the preview. Option 3 throws that away, and Option 4 fails the ATS requirement outright.

Option 2 is the strongest alternative and the right one if a real one click file becomes essential. But for this team and stage it adds a heavy dependency, cold starts on serverless functions, a second pagination run, and auth plumbing into a headless browser, all to remove one dialog step. The browser's own print to PDF already produces a text based, ATS readable file. The cost of Option 1 is UX friction (the dialog) and less control (headers in some browsers), which the tip line covers well enough for now. If users struggle with the dialog, Option 2 can be added later as a new spec, and nothing in Option 1 blocks that.

The smaller calls follow the same reasoning. The print stylesheet lives on the detail page (not a separate print route) because the page has already measured the pages; a route would measure again in a second document. The placeholder confirm counts every printed field, not just the editor's summary, bullets, and skills, because import (spec 0006) can leave `[Company]` in an entry field and that is exactly what must not reach an employer. Downloads are not recorded because the print dialog cannot report whether a file was saved, so a record would mislead. The file name and title use `beforeprint` and `afterprint` so Ctrl+P gets the same `Jane Doe Resume` name as the button.
