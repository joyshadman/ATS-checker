# Resume document (lib/resume)

## Overview

Shared shapes and pure helpers for the structured resume document: the Zod schema stored in `Resume.content`, the editor form mapping, deterministic text rendering, viewer templates, and the rules that split a sheet into printed pages. Almost every file here is pure (no Prisma, no `"use server"`), so the browser and the server import the same code.

## Key files

| File | Owns |
|---|---|
| `content.ts` | The section document schema (spec 0001): `resumeContentSchema`, `parseResumeContent`, `CURRENT_SCHEMA_VERSION`, size caps, and the error strings the UI matches on |
| `form.ts` | The only place form paths map to schema paths (spec 0002): `toForm`, `toContent`, `resumeFormResolver`, `OPTIONAL_SECTIONS` |
| `render.ts` | `renderResumeText`: deterministic plain text saved as `Resume.contentText` and sent to the AI |
| `templates.ts` | Template ids, link styles, and their resolvers; stored ids are plain strings |
| `fonts.ts` | The three sheet fonts, self hosted through `next/font/local`, exported as `sheetFontVariables` |
| `paginate.ts` | `paginate(heights, keepWithNext, pageHeight)`: greedy A4 page fill |
| `format.ts` | Locale free month, date range, and URL formatting for the sheet |
| `placeholders.ts` | `[X%]` placeholder detection and counting |
| `import.ts` | AI import budget, messages, and the cleaner that turns a raw answer into a valid document (spec 0006) |
| `section-writing.ts` | Section writing request shapes, style list, and the cleaners for AI answers (spec 0003) |

## Conventions

- Every write to `Resume.content` goes through `parseResumeContent`. Never cast a raw `Prisma.JsonValue` into `ResumeContent`.
- When the document shape changes, bump `CURRENT_SCHEMA_VERSION` and keep `parseResumeContent` reading older versions.
- Throw the exported message constants (`RESUME_CONFLICT`, `SECTIONS_UNREADABLE`, and friends) instead of retyping strings: the UI compares against them.
- Keep new helpers pure so the editor, the viewer, and the server actions all use one implementation.
- Size caps live here (`MAX_ENTRIES`, `MAX_BULLETS`, `MAX_LINKS`): raise them in one place and the schema, the cleaners, and the UI follow.

## Gotchas

- `fonts.ts` reads woff2 files from `node_modules` through `next/font/local`. Fetching Google Fonts at build time breaks Turbopack, so do not switch to `next/font/google`.
- `render.ts` output is stored on the resume and also used as AI prompt text, so changing it changes the prompt and misses the AI response cache.
- `paginate.ts` only decides which measured block sits on which page; it never changes a block. Measurement stays in the viewer.
- The editor form shape is not the document shape: bullets are `{ value }` objects because React Hook Form field arrays need objects, and skills are one text box per group.

## Related specs

`docs/specs/0001-structured-resume-data-model`, `0002-resume-maker-section-editor`, `0003-ai-section-writing`, `0006-import-resume-into-editor`, `0007-resume-viewer-ats-templates`, `0008-pdf-export`, `0009-editor-live-preview`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
