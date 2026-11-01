# Verify: Editor live preview · spec 0009 · updated 2026-10-31
_Steps derived from spec 0009 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
Sign in, open a built resume, click Edit resume (`/resumes/[id]/edit`).

- [x] At 1440 px wide: the form is on the left and a "Preview" column on the right; scroll the page and the preview stays under the save bar and scrolls on its own; no horizontal scroll → AC-1
- [x] At 1280 px exactly: still two columns, the save bar is one row, and the Edit / Preview switch is hidden → AC-1, AC-2
- [x] On first load the sheet shows the saved resume at once (no blank frame) → AC-3
- [x] Type a new bullet: the sheet shows it about 300 ms after you stop, while the bar says "Unsaved changes" → AC-3
- [x] Add and remove an entry, remove an optional section: the sheet follows each change → AC-3
- [x] Type `linkedin.com/in/ja` as a contact link URL and set an end date before the start: the sheet shows both as typed, the form shows its field errors, the sheet never blanks → AC-4
- [x] Add a link with a label and no URL, and a project with a URL but no name: the sheet renders, nothing crashes → AC-4, AC-16
- [x] Type `javascript:alert(1)` and `/resumes` as link URLs: both show as text on the sheet; clicking them does nothing → AC-15
- [x] With a valid form, Save, then open the detail page: its sheet matches the editor preview → AC-4
- [x] Pick Modern in the editor: the sheet switches at once, a quiet "Saving..." note shows briefly, the bar label does not change, Save stays disabled if nothing else changed → AC-5, AC-7
- [x] Pick Label only under Links: the contact links switch to labels at once → AC-6
- [x] With unsaved edits pending, change the template, then Save: it succeeds with no "Changed elsewhere"; `contentUpdatedAt` in Prisma Studio changes only from the Save, not the pick → AC-7
- [x] Open the detail page after a pick: it shows the new template and link style → AC-7
- [x] Go offline (dev tools), pick Compact: it reverts to the saved template with the toast "Could not save the template. Try again." Same for Links with "Could not save the link style. Try again." → AC-5, AC-6
- [x] Click Classic, Modern, Compact quickly: the final saved value (after reload) is Compact → AC-5
- [x] Add entries until a third page appears: the "Your resume runs past 2 pages" warning shows above the sheet; remove one and it disappears → AC-8
- [x] The preview has no placeholder highlight, no Download PDF button, and no AI draft sheet → AC-9
- [x] Save: the sheet shows the saved values at once. Edit and save the same resume in a second tab, then Save in the first and press Reload: the sheet shows the reloaded content at once → AC-10
- [x] Accept an AI suggestion into a field: the sheet follows → AC-10
- [x] Change the template in another tab, press Reload on a conflict here: content refreshes, the template does not (until the next page load) → AC-10
- [x] Set a resume to Modern on the detail page, then open the editor: the pickers and sheet start on Modern → AC-11
- [x] Start an AI section write, pick Compact during it: the sheet switches at once, "Saving..." stays until the AI finishes, then the pick is saved → AC-12
- [x] Keyboard: Tab to the Template row, use arrow keys to move and select; below 1280 px, arrow keys move between the Edit and Preview tabs; a screen reader announces each option's description and the "Resume preview" region → AC-13
- [x] Dark mode: the sheet stays white paper with dark ink in the template's own fonts → AC-14
- [x] At 375 px: the bar shows the Edit / Preview switch, default Edit; edit a field, scroll down, tap Preview: the sheet shows the edit; tap Edit: the text is still there and the page is back at the same scroll position → AC-2
- [x] At 375 px on the Preview tab, with a required field cleared, press Save: the editor switches to Edit and focuses that field → AC-2
- [x] At 1024 px (tablet): tabs, not columns → AC-2
- [x] Resize a 1440 px window with unsaved edits below 1280 px and back: the pages and scale are correct each time → AC-1, AC-2
- [x] Dev tools CPU slowed 6x, type quickly on a 2 page resume: no dropped keystrokes → AC-3

## Value sourcing
- [x] Initial template and link style come from the saved row: set Compact and Label only on the detail page, open the editor, both are selected → `getResumeContent` `templateId` / `linkStyle`
- [x] A stored unknown template value (set `templateId` to `fancy` in Prisma Studio) opens as Classic → `resolveTemplateId`
- [x] Preview content from the form, valid path: a valid form matches the saved detail page sheet → `parseResumeContent(toContent(values))`
- [x] Preview content from the form, lenient path: an invalid form still renders, blank bullets hidden → `toPreviewContent`
- [x] Link clickability from the URL protocol: `https://x.com` is clickable, `x.com` is text → `safeLinks`
- [x] Page count from the sheet: the warning appears exactly when page 3 appears → `onPageCount`
- [x] Sticky offset from the measured bar: give the title an error (clear it and blur) at 1440 px; the bar grows and the preview column moves down so it is not covered → `--editor-bar-h`
- [x] Layout from the viewport width: 1279 px shows tabs, 1280 px shows columns → `WIDE_QUERY`

## Commands
- [x] `npx tsc --noEmit -p .` → no errors → all
- [x] `npm run lint` → no errors → all
- [x] `npm run build` → succeeds → all

## Acceptance-criteria coverage
- AC-1 resize, 1440 px, 1280 px · AC-2 375 px steps, 1024 px, Save on Preview · AC-3 first load, typing, CPU check · AC-4 invalid input, crash guards, matches detail page · AC-5 Modern pick, offline, quick picks · AC-6 Label only, offline · AC-7 no dirty, no conflict, detail page shows pick · AC-8 page 3 warning · AC-9 exclusions · AC-10 Save, Reload, AI suggestion · AC-11 starts on saved look · AC-12 pick during AI write · AC-13 keyboard and screen reader · AC-14 dark mode · AC-15 unsafe links · AC-16 crash guards
