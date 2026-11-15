# Resume section editor (components/resume/editor)

## Overview

The section editor: one React Hook Form tree over the whole resume document, with a tab for editing and a live preview, inline AI writing, and a save that refuses to overwrite someone else's change. It is the only place the document is edited by hand.

## Key files

| File | Owns |
|---|---|
| `resume-editor.tsx` | The form, the save loop, the version check, tab state, and the draft and conflict dialogs |
| `sections.tsx` | Experience, education, project, skills, and other section blocks with their field arrays |
| `fields.tsx` | Text, textarea, and dated field primitives bound by name path |
| `bullet-list.tsx` | One bullet field array, reused by every section that has bullets |
| `date-range-fields.tsx` | Start, end, and "current" inputs |
| `ai-writing.tsx` | The AI button and style picker per target |
| `suggestion-panel.tsx` | Shows the AI answer before it is applied |
| `editor-preview.tsx` | Renders the unsaved form through the real sheet |
| `target-role-box.tsx` | The target role and job text used as AI context |
| `import-notice.tsx` | The notice left after an AI import |

## Conventions

- Form values are `ResumeForm` from `lib/resume/form.ts`. Convert with `toContent` before calling any action, and never pass form state straight to the server.
- Every save sends `expectedUpdatedAt` with the version this editor loaded. The action does a compare and swap, so a second tab gets a conflict instead of silently winning.
- On `RESUME_CONFLICT`, first re-read the stored document and treat an identical document as saved (a lost response). Only then show the conflict state.
- AI writing reads the unsaved text from the form and never writes the document: the answer lands in the suggestion panel and the user applies it. Each applied answer costs one AI use.
- Placeholders are rendered through `splitPlaceholders`, never by injecting HTML.
- `useUnsavedChanges(isDirty && !saving)` guards reloads and internal links; it cannot guard browser Back or `router.push`.

## Gotchas

- The `version` state is seeded once from props and never re-read from props. Any new content coming from the server must go through `adopt()` so the version and the form reset together.
- `flushSync` is used when switching to the edit tab, because React Hook Form focuses the first invalid field immediately after submit and the form has to be visible first.
- Template and link style save on their own through `useSavedChoice` and never mark the form dirty; appearance saves must not touch `contentUpdatedAt`.
- Bullets are `{ value }` objects, so a new bullet is `{ value: "" }`, not a string.

## Related specs

`docs/specs/0002-resume-maker-section-editor`, `0003-ai-section-writing`, `0006-import-resume-into-editor`, `0009-editor-live-preview`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
