# Resume viewer and print (components/resume/viewer)

## Overview

Turns a saved resume document into a styled A4 sheet, split into real pages, and exports it as a PDF by printing. Three templates and two link styles, both saved per resume. The editor preview reuses the same sheet, so look changes only need to land here.

## Key files

| File | Owns |
|---|---|
| `resume-viewer.tsx` | The viewer page body: template and link style choices, placeholder warning, download button |
| `resume-sheet.tsx` | Picks the template module and renders `PaginatedSheet` |
| `paginated-sheet.tsx` | Measures blocks, calls `paginate`, renders on screen pages plus a print only copy |
| `parts.tsx` | `SheetBlock`, `SheetOptions`, `TemplateModule` types shared by templates |
| `templates/{classic,modern,compact}.tsx` | One module per template: page class, blocks, and printed typography |
| `choices.tsx` | `ChoiceGroup`, `SheetArea`, and `useSavedChoice` (optimistic save with rollback) |
| `pdf-download-button.tsx` | Confirm on placeholders, then open the browser print dialog |
| `use-print-title.ts` | Sets the document title during print so the PDF gets a sensible file name |

## Conventions

- Layout is always measured at 794 by 1123 pixels, which is A4 at 96 dots per inch. The screen width only changes the display scale, never the layout.
- The print page box is 1122 pixels tall on purpose: a page box a fraction too tall makes browsers add blank pages.
- A template is a module exporting a page class and block renderers. Its page class reads the font CSS variables from `lib/resume/fonts.ts`, so only the family in use loads.
- PDF export never touches the server. It prints a print only copy of the measured pages.
- Appearance changes go through `setResumeAppearance` and `useSavedChoice`, which roll back on failure and never revalidate content.

## Gotchas

- Nothing may print before the fonts are loaded and the pages are measured; `ready` gates the download button for that reason.
- The printed copy is portaled into a print only container, not the visible one, so the on screen scale never leaks into the PDF.
- Link style `url` prints the address as text, which is what ATS parsers and paper readers need. Do not silently fall back to link text.

## Related specs

`docs/specs/0007-resume-viewer-ats-templates`, `0008-pdf-export`, `0009-editor-live-preview`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
