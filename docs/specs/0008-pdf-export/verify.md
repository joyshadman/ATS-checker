# Verify: PDF export · spec 0008 · updated 2026-10-31
_Steps derived from spec 0008 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open a built resume at `/resumes/[id]` → "Download PDF" shows in the "Your Resume" card above the pages, with the tip "Choose Save as PDF in the print dialog. Turn off Headers and footers if you see them." → AC-1
- [ ] Open an upload, a resume with unreadable content, the editor, and a resume with an improvement draft → no button on the upload, the unreadable one, the editor, or the draft card → AC-1
- [ ] On a 1 page Classic resume with no placeholders, click Download PDF → the print dialog opens; the preview shows 1 page that looks like the viewer, with no sidebar, cards, pickers, labels, shadow, or highlight → AC-2
- [ ] Save as PDF → the suggested name is `<full name> Resume.pdf`; after the dialog closes (saved or cancelled) the tab title is back to normal → AC-6
- [ ] A 2 page Compact and a 2 page Modern resume → the PDF has exactly 2 pages, the first and last block on each page match the viewer, and there is no blank third page; repeat in Chrome, Edge, Firefox, and Safari (or iOS Safari) → AC-2
- [ ] Copy all text from the PDF → it is real text in section order; click a contact link in the PDF (Chrome, Edge, Firefox) → it opens → AC-3
- [ ] Switch template and click Download PDF straight away → the button reads "Saving…" until the save lands; offline, switch template, it reverts, then the PDF uses the reverted template → AC-4
- [ ] Cold load with cache disabled → the button reads "Preparing pages…" until the pages appear → AC-5
- [ ] An imported copy with `[Company]` in an experience entry → click Download PDF → "1 placeholder is still in your resume"; "Edit resume" opens the editor; "Download anyway" opens print; Escape, the close button, or a click outside prints nothing → AC-7
- [ ] With two placeholders, the title reads "2 placeholders are still in your resume"; with link style Label only and a link label `[Site]`, it is counted; with Visible URL it is not → AC-7
- [ ] A 3 page resume → Download PDF works, the PDF has 3 pages, and the "runs past 2 pages" warning is not printed → AC-8
- [ ] A new empty resume → the button is disabled and the "no sections yet" hint shows → AC-9
- [ ] Press Ctrl+P (Cmd+P) on a built resume → the preview shows the same clean pages and the same file name as the button, without the placeholder confirm → AC-10
- [ ] Turn on dark mode and narrow the window to 360 px, then print → the same white, full size A4 pages and breaks as light mode on desktop → AC-11
- [ ] With the devtools network panel open, click Download PDF and save → no request is sent → AC-12
- [ ] On an upload's detail page, press Ctrl+P → the page prints as before (the print stylesheet does not act there)

## Commands
- [ ] Run a saved PDF through `pdf-parse` (already a dependency) → the text contains every section heading in order → AC-3
- [ ] `npm run lint` and `npm run build` → both pass → AC-1 to AC-12

## Value sourcing
- [ ] File name comes from the saved `contact.fullName`: change the name in the editor, save, and download → the new name is suggested; a name with `/` or `:` drops those characters
- [ ] The placeholder count follows the shown link style: switch between Visible URL and Label only with a `[Site]` link label → the count changes by one
- [ ] The print copy reuses the viewer's measured pages: the viewer's "Page N of M" count equals the PDF page count for each template
- [ ] The print copy uses the saved template and link style: switch, wait for the save, download → the PDF matches

## Acceptance-criteria coverage
- AC-1: UI steps 1, 2 · AC-2: steps 3, 5 · AC-3: step 6, command step 1 · AC-4: step 7 · AC-5: step 8 · AC-6: step 4 · AC-7: steps 9, 10 · AC-8: step 11 · AC-9: step 12 · AC-10: step 13 · AC-11: step 14 · AC-12: step 15
