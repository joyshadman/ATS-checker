# File parser (lib/parser)

## Overview

Turns an uploaded resume or cover letter (`File` from FormData) into plain text. Supports PDF, DOCX, and TXT up to 10 MB; anything else throws.

## Key files

| File | Owns |
|---|---|
| `lib/parser/resume-parser.ts` | `parseResumeFile(file)` returns `{ text, fileName }`, picks the parser by file extension |

## Conventions

- PDF text comes from `pdfjs-dist` (legacy build) directly, page by page, joined with blank lines. The `pdf-parse` package is installed but not called.
- DOCX goes through `mammoth.extractRawText`.
- Errors are thrown as plain `Error`s; the calling server action's `withAction` wrapper turns them into `{ success: false, error }`.

## Gotchas

- `pdfjs-dist` is not a direct dependency in `package.json`; it arrives through `pdf-parse`. Removing `pdf-parse` breaks PDF upload unless you add `pdfjs-dist` directly.
- `pdfjs-dist` must stay in `serverExternalPackages` in `next.config.ts`.
- The file defines a small `DOMMatrix` polyfill and preloads the pdf worker into `globalThis.pdfjsWorker`. Both work around Turbopack server bundling failures (`DOMMatrix is not defined`, unresolvable worker import). Don't remove them without testing a PDF upload.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
