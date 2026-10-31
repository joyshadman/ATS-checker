# 0007. Resume viewer: built resumes render as A4 pages in one of three code templates, chosen per resume

**Date**: 2026-10-31
**Status**: In Progress

## Summary

A built or imported resume's page now shows the resume as real A4 pages (white sheets the size of printed paper) instead of plain monospace text. A resume that fits shows as one page; a longer one flows onto page 2, and a warning appears if it runs past 2 pages. You can pick one of three ATS friendly templates (Classic, Modern, Compact) and one of three link styles. Each resume remembers its own choice in two new text columns. The templates are React components built in code from three Figma frames, so every one is single column, real selectable text, and safe for applicant tracking systems (the software employers use to read resumes). Changing the look is free (no AI use) and never counts as a content edit, so analyses don't go out of date. Uploaded resumes keep their text view.

## Requirements

**User stories**:
- As a job seeker with a built resume, I want to see it laid out like a real resume so that I know what an employer will see.
- As a job seeker, I want to pick from a few ATS friendly templates so that my resume looks the way I like without risking how ATS software reads it.
- As a job seeker, I want to choose how my links show, with the pros and cons explained, so that I can trade looks for parser safety knowingly.
- As a job seeker, I want each resume to remember its own template so that I can keep a compact one and a classic one side by side.

**Acceptance criteria**:
- **AC-1**: On `/resumes/[id]`, a resume with sections (`content` not null) shows its saved sections as A4 pages in its saved template, in place of the "Original Resume" monospace text box. An uploaded resume (`content` null) is unchanged: text box plus the "Open in editor" button from spec 0006.
- **AC-2**: There are exactly three templates, Classic, Modern, and Compact, matching the Figma frames listed under *Design source* (font family, name and contact placement, heading style, entry header layout, spacing). Every template is one column, uses real text (selectable, nothing drawn as an image), shows sections in the fixed order Contact, Summary, Experience, Education, Skills, Projects, Certifications, Languages, and hides any section with no entries (and the Summary when it is empty).
- **AC-3**: Above the sheet, a template picker shows the three template names, each with a one line description, with the saved one selected. Choosing another updates the sheet at once and saves it to `Resume.templateId`. After a reload the saved template shows. Existing resumes and every new built or imported resume start on Classic.
- **AC-4**: Next to the template picker, a link style picker offers three options, each with its tradeoff line: **Visible URL** ("Best for ATS and printing: the address is always readable. Takes a little more room."), **Label only** ("Cleanest look. Many ATS and printed copies lose the address."), **Label and URL** ("Clearest for people and parsers. Takes the most room on the contact line."). The choice applies at once, saves to `Resume.linkStyle`, and defaults to Visible URL. Contact links and the project URL render as clickable links: Visible URL shows the URL without `http://` or `https://` and without a trailing `/` (for example `linkedin.com/in/jane`); Label only shows the link label; Label and URL shows `Label: linkedin.com/in/jane`. Certification URLs follow the same style.
- **AC-5**: Saving a template or link style writes only `templateId` or `linkStyle`. It never changes `content`, `contentText`, `contentUpdatedAt`, or `improvedContent`, so the latest analysis and interview questions are not marked "Out of date", and a save in an editor that was open before the switch succeeds without a "changed elsewhere" conflict.
- **AC-6**: Dates show as an English short month and year, the same in every browser and locale: `Mar 2021`. A range shows `Mar 2021 – Present` (U+2013 en dash with spaces) when `current` is true, `Jan 2018 – Feb 2021` with both dates, just the one date when only one is set, and nothing when neither is. A certification shows its single date.
- **AC-7**: Placeholders in square brackets (the spec 0003 pattern, for example `[X%]` or `[Company]`) are highlighted on the sheet with a soft amber background. The text itself is unchanged.
- **AC-8**: When a built resume has an AI improvement draft whose `improvedContent` parses, the "Improved Resume" card shows the draft as a second sheet in the same template and link style, stacked below the saved sheet at full width, with its Accept and Discard buttons above it. A draft that exists only as text (`improvedText` on an upload, or `improvedContent` that fails to parse) keeps today's text box.
- **AC-9**: In dark mode the sheet stays white paper with dark ink (and the Modern accent stays navy); only the page around it changes.
- **AC-10**: Each page is an A4 sheet of 794 x 1123 px (210 x 297 mm at 96 px per inch) with the template's margins, centered, with a 24 px gap between pages and a muted "Page 1 of 2" label under each. When the available width is under 794 px (for example a 360 px phone), every page is scaled down as a whole to fit the width, keeping the exact same layout and page breaks; there is no horizontal page scroll.
- **AC-11**: If saving a template or link style fails (offline, server error), the picker and sheet go back to the last saved value and a toast says "Could not save the template. Try again." (or "Could not save the link style. Try again."). When several changes are made quickly and all succeed, the final saved value is the last one picked; a late answer for an older pick never overrides a newer one.
- **AC-12**: `setResumeAppearance` is owner only: another user's resume id returns "Resume not found" or "Unauthorized" and writes nothing. On a resume with no sections it returns "This resume has no sections". A template or link style value outside the registry returns a validation message and writes nothing.
- **AC-13**: A stored `templateId` or `linkStyle` that is not in the registry (for example a template removed later) renders as Classic or Visible URL, logs a warning on the server, and never breaks the page. The picker then shows the fallback as selected.
- **AC-14**: A resume whose `content` cannot be parsed shows today's text box (from `contentText`) with the note "This resume's sections could not be read, so it is shown as plain text." instead of failing the page.
- **AC-15**: A built resume with no summary and no entries shows one page with just the contact block, and above the pages the hint "This resume has no sections yet." with a link "Add them in the editor" to `/resumes/[id]/edit`.
- **AC-16**: Content that fits on one A4 page shows as exactly one page. Content that does not fit flows onto page 2, page 3, and so on; nothing is ever hidden or cut off, and font size and spacing never shrink to make it fit.
- **AC-17**: When the resume needs more than 2 pages, a warning shows above the pages: "Your resume runs past 2 pages. Most recruiters expect 1 to 2." It disappears as soon as the resume fits in 2 pages (for example after switching to Compact).
- **AC-18**: Page breaks fall only between blocks, never inside one. A block is the contact header, the summary paragraph, a section heading, an entry header (title, company, dates, location lines), one bullet, one skills line, one certification line, or the languages line. A section heading always moves to the next page together with the block after it, and an entry header always moves together with its first bullet (or the next block when it has no bullets), so no heading is left alone at the bottom of a page. A single block taller than a whole page starts a new page and is allowed to run past the bottom margin (it is never split).
- **AC-19**: Pages are recomputed whenever the template, the link style, or the content changes, and after the template fonts finish loading, so breaks always match what is shown. The draft sheet (AC-8) is paginated the same way with its own page count and warning.

## Decision

**Chosen option**: Option 2: Three template React components sharing one set of section building blocks, a code registry, and two text columns on `Resume`.

Add `templateId` (default `classic`) and `linkStyle` (default `url`) to `Resume`, a registry in `lib/resume/templates.ts`, three template components under `components/resume/viewer/templates/` built from the Figma frames, a client `ResumeViewer` that owns the pickers and the optimistic save, and one owner only server action `setResumeAppearance`.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Design source**: Figma file **ATS Resume Templates**, `https://www.figma.com/design/uFSbF56lIXPVXwaMGuFjeD`, page "Resume templates". Frames: **Template / Classic (A4)** (node `9:2`), **Template / Modern (A4)** (node `10:2`), **Template / Compact (A4)** (node `11:2`). Each frame is one A4 page, 794 x 1123 px, with sample content; page margins are 72 px for Classic and Modern and 48 px for Compact. `/develop` reads them with the Figma MCP (`get_design_context` on each node) and matches font, sizes, spacing, rules, and alignment. The frames are a reference to adapt, not code to paste. If the frames and this spec disagree, the spec's acceptance criteria win and the gap is noted.

| Template | Font (next/font/google) | Look |
|---|---|---|
| Classic (`classic`) | Source Serif 4 | Name centered, contact line centered under it joined by ` \| `, uppercase letter spaced section headings with a thin full width rule below, entry: bold title with dates right aligned, then italic company with location right aligned |
| Modern (`modern`) | Inter | Large left aligned name, contact line joined by ` · `, uppercase headings in accent navy `#1F3A5F` with a 3 px navy bar on the left, entry: one line `Title, Company, Location` with dates right aligned in gray |
| Compact (`compact`) | IBM Plex Sans | Name and contact on one line (name left, contact right) above a rule, small uppercase headings, tighter line height and margins, entry: `Title \| Company \| Location` with dates right aligned |

All three: black ink `#111111` on white `#FFFFFF`, bullets as a real `<ul>`, skills as `Category: a, b, c` one line per group, certifications as `Name, Issuer` (Compact `Name \| Issuer`) with the date right aligned, languages as `Language (proficiency)` joined on one line.

**Data model sketch** (Prisma, applied with `npx prisma db push`, no migrations folder in this project):

`Resume` (existing table, additive):

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `templateId` | `String` | no | `"classic"` | One of the registry ids. Read through `resolveTemplateId`, never trusted raw |
| `linkStyle` | `String` | no | `"url"` | One of `url`, `label`, `both`. Read through `resolveLinkStyle` |

```prisma
templateId String @default("classic")
linkStyle  String @default("url")
```

- Existing rows get the defaults on `db push`. Uploads carry the columns too (unused until imported; an imported copy is a new row and starts on the defaults).
- No index: never filtered or sorted on.
- No other table changes.

**Registry** (`lib/resume/templates.ts`, pure, importable by client and server):
- `TEMPLATES`: ordered list of `{ id, name, description }` for `classic` ("Traditional serif, centered name"), `modern` ("Clean sans with navy headings"), `compact` ("Tight spacing to fit more on a page").
- `LINK_STYLES`: ordered list of `{ id, name, tradeoff }` for `url`, `label`, `both`, with the AC-4 wording.
- `TemplateId`, `LinkStyle` types; `templateIdSchema` and `linkStyleSchema` (Zod enums built from the lists).
- `resolveTemplateId(raw: string, resumeId): TemplateId` and `resolveLinkStyle(raw, resumeId): LinkStyle`: return the value when valid, else the default and `console.warn("[Viewer] unknown templateId ...")` (AC-13).
- `DEFAULT_TEMPLATE_ID = "classic"`, `DEFAULT_LINK_STYLE = "url"`.

**Formatting helpers** (`lib/resume/format.ts`, pure):
- `formatMonth("2021-03") → "Mar 2021"` from a fixed English month array (never `toLocaleString`).
- `formatRange({ start, end, current }) → string` by the AC-6 rules, en dash `–` with spaces.
- `displayUrl(url) → string`: drop `http://` or `https://`, drop one trailing `/`.
- `linkText(link, style)`: the AC-4 text for a `{ label, url }` (project and certification URLs pass their own name as label).

**Rendering**:
- `components/resume/viewer/parts.tsx`: shared building blocks used by every template: `Placeholders` (renders a string through `splitPlaceholders` from `lib/resume/placeholders.ts`, wrapping placeholder parts in `<mark>` when `highlight` is true), `SheetLink` (an `<a href target="_blank" rel="noopener noreferrer">` with `linkText`), `Bullets`, `DateText`. No hooks, so they work in server and client components.
- `components/resume/viewer/templates/classic.tsx`, `modern.tsx`, `compact.tsx`: each exports a pure function `blocks(content, { linkStyle, highlight }): SheetBlock[]` that returns the resume as an ordered flat list of blocks in the fixed section order, skipping empty sections (AC-2), plus a `pageClassName` (font variable, margins, base type size). `SheetBlock = { key: string; kind: "header" | "summary" | "heading" | "entryHead" | "bullet" | "line"; keepWithNext: boolean; node: ReactNode }`. `keepWithNext` is true for `heading` and for `entryHead` (AC-18). A bullet block renders as its own `<ul><li>` with spacing set so consecutive bullets look like one list. Section headings are `<h3>`; the name is a `<p>`.
- `lib/resume/paginate.ts` (pure): `paginate(heights: number[], keepWithNext: boolean[], pageHeight: number): number[][]` returns the block indexes per page. Greedy fill: place blocks while they fit; when block `i` does not fit, move it to a new page, and while the last block left on the previous page has `keepWithNext`, move that one too (never emptying a page; a lone block taller than `pageHeight` gets its own page and overflows, AC-18). `pageHeight` is 1123 minus the template's top and bottom margins.
- `components/resume/viewer/paginated-sheet.tsx` (client): `PaginatedSheet({ content, templateId, linkStyle, highlight })`.
  - Builds the blocks, renders them once in a hidden measuring box (`aria-hidden`, `visibility: hidden`, absolutely positioned, exactly the page's content width and `pageClassName`), and measures each block's height as the distance from its top to the next block's top (the last one to the box bottom), so margins between blocks are counted.
  - Measures after `document.fonts.ready` and again whenever `content`, `templateId`, or `linkStyle` changes (AC-19), then calls `paginate` and renders each page as an `<article>` of 794 x 1123 px with `pageClassName`, holding its blocks; label "Page N of M" below each (AC-10).
  - Before the first measurement it renders all blocks on a single page with `min-height: 1123px` (no fixed height), so content is visible at once and the switch to measured pages is a small shift.
  - Scaling (AC-10): a `ResizeObserver` on the wrapper computes `scale = min(1, wrapperWidth / 794)`; each page is drawn at full size with `transform: scale(scale)` from the top left inside a box of `794 * scale` by `1123 * scale`, so the layout and breaks never change with screen width.
  - Reports `pageCount` to its parent through an `onPageCount` callback, used for the AC-17 warning.
- `components/resume/viewer/resume-sheet.tsx`: `ResumeSheet` picks the template module from a `Record<TemplateId, TemplateModule>` and renders `PaginatedSheet`. This is what PDF export (scope feature 7) reuses with `highlight={false}`; the page size there is A4 to match.
- `lib/resume/fonts.ts`: `Source_Serif_4`, `Inter`, `IBM_Plex_Sans` from `next/font/google` with `subsets: ["latin"]`, `display: "swap"`, the weights the frames use (400, 600, 700, plus 400 italic for Source Serif 4), each exposed as a `variable` (`--font-sheet-classic`, `--font-sheet-modern`, `--font-sheet-compact`). `next/font` downloads them at build time and serves them from the app, so no request goes to Google at runtime.
- Sheet colors are new CSS custom properties in `app/globals.css` under `:root` only and deliberately **not** redefined under `.dark` (AC-9): `--sheet-paper: #FFFFFF`, `--sheet-ink: #111111`, `--sheet-muted: #333333`, `--sheet-rule: #111111`, `--sheet-accent: #1F3A5F`, `--sheet-mark: #FDE68A`, exposed through `@theme inline` (for example `bg-sheet-paper`, `text-sheet-ink`). This follows the "theme tokens only" rule in `AGENTS.md` while keeping the paper fixed.
- Page geometry (AC-10): pages are always laid out at 794 px wide with fixed margins (72 px Classic and Modern, 48 px Compact) and only scaled for display, never reflowed. Entry header rows are `flex justify-between gap-x-4` with the date `whitespace-nowrap`; a very long title wraps on its own side of the row.

**Viewer UI** (`components/resume/viewer/resume-viewer.tsx`, client):
- Props: `resumeId`, `content: ResumeContent`, `draft: ResumeContent | null`, `initialTemplateId: TemplateId`, `initialLinkStyle: LinkStyle`, plus the draft's existing Accept and Discard element passed as `draftActions`.
- Appearance bar above the sheet: a `role="radiogroup"` "Template" with three options (name plus description), and a `role="radiogroup"` "Links" with three options (name plus tradeoff line). Arrow keys move within each group; the selected option uses the accent token; built with theme tokens and existing primitives.
- Optimistic save (AC-3, AC-4, AC-11): keep `saved` (last confirmed) and `shown` per setting. On pick: set `shown`, call `setResumeAppearance`, tag the request with an incrementing counter. On success, if it is the newest request for that setting, set `saved`. On failure, if it is the newest, set `shown` back to `saved` and show the AC-11 toast with `useToast`. Older answers are ignored.
- Renders `ResumeSheet` with `highlight` true for the saved content, then the draft card (AC-8) with `draftActions` above a second `ResumeSheet` for `draft`, using the same `shown` template and link style.
- Over two pages (AC-17): keeps each sheet's `pageCount` from `onPageCount`; when it is above 2, shows the warning (`role="status"`) above that sheet's pages.
- No body (AC-15): the hint line above the pages.

**Detail page** (`app/(dashboard)/resumes/[id]/page.tsx`):
- Built resume with readable `content` → render `ResumeViewer` full width in place of the two column "Original Resume" / "Improved Resume" grid. The improved card moves into the viewer as the stacked draft (AC-8). A built resume whose draft is text only keeps the text box below the viewer.
- Built resume with unreadable content → today's text box plus the AC-14 note.
- Upload → unchanged.

**API surface** (server actions through `withAction`, authenticated, owner checked with `loadResumeWithAuth`):

| Action | File | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `setResumeAppearance` | `actions/resume.ts` | `resumeId: string` (req), `templateId?: TemplateId`, `linkStyle?: LinkStyle` (at least one) | `{ templateId: TemplateId; linkStyle: LinkStyle }` | session, owner | "Resume not found" · "Unauthorized" · "This resume has no sections" · validation message (`zodIssueMessage`) |
| `getResume` (changed) | `actions/resume.ts` | unchanged | adds `content: ResumeContent \| null` (parsed, never raw), `contentUnreadable: boolean`, `improvedContent: ResumeContent \| null` (parsed, null when absent or unreadable), `templateId: TemplateId`, `linkStyle: LinkStyle` (resolved) | session, owner | unchanged |

`setResumeAppearance` order: Zod check of the input object (`resumeId` non empty, optional `templateIdSchema`, optional `linkStyleSchema`, refine "at least one"); `loadResumeWithAuth`; `content === null` → "This resume has no sections"; `prisma.resume.updateMany({ where: { id, userId }, data: { templateId?, linkStyle? } })` writing only the given fields; `revalidatePath(\`/resumes/${id}\`)`; return the resulting pair. No cooldown (no AI, a cheap single row write). Prisma's `@updatedAt` bumps `updatedAt`, which nothing uses for staleness; `contentUpdatedAt` is untouched (AC-5).

`getResume` parses `content` with `parseResumeContent` inside a `try` (failure → `content: null`, `contentUnreadable: true`, logged) and `improvedContent` the same way (failure → null, logged), keeps `omit: { importNotice: true }`, and stops omitting `content` only to return the parsed form.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| detail page | whether to show the sheet | `getResume().content !== null` and not `contentUnreadable` |
| sheet | every section, entry, field | `Resume.content` parsed by `parseResumeContent` (spec 0001 schema) |
| sheet | section order | fixed in each template component (AC-2), the same order as `renderResumeText` |
| sheet | which template renders | `shown` template in `ResumeViewer`, seeded from `Resume.templateId` through `resolveTemplateId` |
| sheet | link text | `linkText(link, shownLinkStyle)`, seeded from `Resume.linkStyle` through `resolveLinkStyle` |
| sheet | date text | `formatRange` / `formatMonth` from the stored `YYYY-MM` values and `current` |
| sheet | placeholder highlight | `splitPlaceholders` (spec 0003 `PLACEHOLDER_PATTERN`) |
| sheet | fonts | `lib/resume/fonts.ts`, per template id |
| sheet | paper, ink, accent, mark colors | `--sheet-*` tokens in `app/globals.css` |
| pages | page size | constant A4 794 x 1123 px in `paginated-sheet.tsx` |
| pages | page margins and content height | each template's `pageClassName` margins; `pageHeight = 1123 - top - bottom` |
| pages | block heights | measured in the browser from the hidden measuring box after fonts load |
| pages | which blocks go on which page | `paginate(heights, keepWithNext, pageHeight)` |
| pages | `keepWithNext` per block | set by the template's `blocks()` by block kind (AC-18) |
| pages | display scale | `min(1, wrapperWidth / 794)` from a `ResizeObserver` |
| pages | "Page N of M" label | page index and `pages.length` |
| warning | whether to show it | `pageCount > 2` reported by `PaginatedSheet` |
| picker | option names, descriptions, tradeoff lines | `TEMPLATES`, `LINK_STYLES` in `lib/resume/templates.ts` |
| picker | selected options | `shown` state; on failure reset to `saved` (last confirmed server value) |
| draft sheet | draft sections | `Resume.improvedContent` parsed |
| draft sheet | template and link style | the same `shown` values as the saved sheet |
| no body hint | whether the resume has a body | `hasResumeBody(content)` |
| `setResumeAppearance` | owner and user | session via `withAction`, `loadResumeWithAuth` |
| `setResumeAppearance` | returned pair | the written values merged with the row's other column |
| fallback render | default template and link style | `DEFAULT_TEMPLATE_ID`, `DEFAULT_LINK_STYLE` |

**Key invariants**:
- Appearance writes touch only `templateId` and `linkStyle`. `content`, `contentText`, `contentUpdatedAt`, and `improvedContent` are never written by this feature.
- The sheet never invents text: everything shown comes from the stored content, formatted only by the AC-4 and AC-6 rules.
- Every template renders the same sections in the same order; only the look differs.
- Stored ids are always read through the registry resolvers; an unknown value renders the default, never throws.
- The sheet colors do not change with the theme.
- Pagination never changes the text or its size: it only decides which page each block sits on. No block is split, and nothing is hidden.
- Page layout is always computed at the real A4 width; screen width only changes the display scale.
- `content` and `improvedContent` reach the client parsed, never as raw JSON.

**Security model**:
- Owner only: `setResumeAppearance` loads with `loadResumeWithAuth(userId, resumeId)` and writes with `where: { id, userId }`; `getResume` already filters by `userId`.
- Links render only http and https URLs (the spec 0001 schema rejects others), opened with `rel="noopener noreferrer"`.
- All resume text renders as React text, never raw HTML; placeholders use `<mark>` elements, not injected markup.
- No new third party at runtime (fonts are self hosted by `next/font`), no new PII flow, no compliance scope.

**Configuration required**: none. No new env vars; fonts are fetched by `next/font` at build time.

**Critical test scenarios**:
- Happy path: open a built resume, see the Classic sheet with every filled section in order; switch to Modern and Compact, reload, the last pick stays; the sheets match the Figma frames, verifies **AC-1**, **AC-2**, **AC-3**.
- Link styles: switch through the three styles and check the contact line and a project URL each time, including that the tradeoff lines show, verifies **AC-4**.
- No content change: note `contentUpdatedAt` in Prisma Studio, switch template, confirm it is unchanged and the latest analysis is not "Out of date"; with the editor open in another tab before the switch, Save there succeeds, verifies **AC-5**.
- Dates: entries with start and current, start and end, only start, only end, none, and a certification date render by the AC-6 rules in two browser locales, verifies **AC-6**.
- Placeholders: an imported copy with `[Company]` and a bullet with `[X%]` shows both highlighted, verifies **AC-7**.
- Draft: run Improve on a built resume; the draft shows as a second sheet below in the same template; switching template changes both; Accept and Discard still work, verifies **AC-8**.
- Dark mode and phone: toggle dark mode (the sheet stays white); at 360 px the pages scale down with the same breaks as desktop and no sideways scroll, verifies **AC-9**, **AC-10**.
- One page: a short resume shows exactly one page labelled "Page 1 of 1", verifies **AC-16**.
- Two pages and breaks: a resume slightly longer than a page flows onto page 2; no section heading or entry header sits alone at the bottom of page 1, and no bullet is split, verifies **AC-16**, **AC-18**.
- Over two pages: a long resume shows page 3 and the warning; switching to Compact brings it to 2 pages and the warning disappears, verifies **AC-17**, **AC-19**.
- Font load: on a cold load (cache disabled) the final breaks match those after a reload with fonts cached, verifies **AC-19**.
- Failure case: go offline (devtools), switch template; it reverts with the toast; back online, switch three times quickly; the last pick is what reload shows, verifies **AC-11**.
- Auth/permission: a second user calls `setResumeAppearance` with the first user's id and gets "Unauthorized" or "Resume not found", nothing written; calling it on an upload returns "This resume has no sections"; `templateId: "fancy"` returns a validation message, verifies **AC-12**.
- Bad stored values: set `templateId` to `"retro"` in Prisma Studio; the page renders Classic and the server logs a warning, verifies **AC-13**.
- Corrupt content: set `content` to `{}` in Prisma Studio; the page shows the text box with the AC-14 note, verifies **AC-14**.
- Empty resume: a new resume from New resume shows the contact only sheet and the editor hint, verifies **AC-15**.

## Build plan

Tracer Bullet: tasks 1 to 3 run one thin thread through every layer (column, read, one template on the page, the save action, the picker), then tasks 4 to 7 thicken it with the other templates, link styles, the draft, and the edge cases.

1. Add `templateId` and `linkStyle` to `Resume` in `prisma/schema.prisma`; run `npx prisma db push` and `npx prisma generate`; confirm the columns and defaults are live, satisfies **AC-3**, **AC-4**.
2. Add `lib/resume/templates.ts` (registry, schemas, resolvers) and `lib/resume/format.ts` (`formatMonth`, `formatRange`, `displayUrl`, `linkText`); extend `getResume` with parsed `content`, `contentUnreadable`, parsed `improvedContent`, and resolved `templateId` and `linkStyle`, satisfies **AC-6**, **AC-13**, **AC-14**.
3. Add the `--sheet-*` tokens, `lib/resume/fonts.ts`, `parts.tsx`, the Classic template `blocks()` from Figma node `9:2` (rendered on a single unpaginated page for now), `ResumeSheet`, and a first `ResumeViewer` with the template picker and the optimistic `setResumeAppearance` save; render it on the detail page for built resumes, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-7**, **AC-9**, **AC-11**, **AC-12**.
4. Build the Modern (node `10:2`) and Compact (node `11:2`) templates against the same parts, satisfies **AC-2**.
5. Add the link style picker with its tradeoff lines and wire `linkText` through every link, satisfies **AC-4**, **AC-11**.
6. Move the improvement draft into the viewer as the stacked second sheet with its Accept and Discard actions; keep the text box for text only drafts, satisfies **AC-8**.
7. Add `lib/resume/paginate.ts` and `PaginatedSheet` (measuring box, font load and change triggers, A4 pages, labels, scaling) and switch `ResumeSheet` to it; add the over two pages warning, satisfies **AC-10**, **AC-16**, **AC-17**, **AC-18**, **AC-19**.
8. Handle the edge states: unreadable content note, no body hint, and the fallback for unknown stored values, satisfies **AC-13**, **AC-14**, **AC-15**.
9. Run `npm run lint` and `npm run build`; check the three templates against the A4 Figma frames in light, dark, phone, and desktop; run the critical test scenarios against the real app and database, satisfies **AC-1** to **AC-19**.

## Consequences

**Positive**:
- Users see what employers will see, and the detail page finally reflects the structured editor work.
- The template components are the single source for the look, so PDF export (feature 7) prints the same thing instead of building a second renderer.
- Adding a fourth template is one component plus one registry entry, no migration.
- Switching looks is free and instant and can't make analyses stale.

**Negative / tradeoffs**:
- Three fonts add about 150 to 250 KB of font files on the detail page the first time they load (only the families a page uses are fetched, so a page usually loads one).
- Pagination is measured in the browser, so pages shift once on first load (all content on one page, then split), and the server rendered HTML has no page breaks.
- Breaks depend on font metrics; a browser that substitutes a font before `next/font` loads can show different breaks for a moment, which is why pages are measured again after fonts load.
- Pages are fixed to A4. US users get A4 too; a Letter option would mean a third per resume setting.
- On a phone the scaled pages show small text; the user pinches to zoom to read details.
- Templates are code: changing a template's look needs a deploy, and the Figma frames can drift from the code unless someone keeps them in step.
- Text columns accept any string at the database level; correctness relies on the Zod check on write and the resolver on read.
- The Modern navy accent is a fixed brand neutral color, not configurable.
- The detail page grows: the saved sheet and the draft sheet stacked can make a long page for long resumes.

**Neutral**:
- One `db push` adding two columns with defaults; existing rows are untouched otherwise.
- `getResume` now returns parsed `content` and `improvedContent` (still never raw JSON), which slightly increases the page payload.
- Each sheet renders its blocks twice (once hidden for measuring), roughly doubling its DOM size; resumes are small, so this is fine.
- `next/font` downloads the three families during `npm run build`, so builds need network access (they already do for Geist).

## Follow-up

- [ ] `/sync` after the build: add `components/resume/viewer/` and the `--sheet-*` tokens to the root `AGENTS.md` structure and theming notes, and note in `context/ui-theme.md` that sheet tokens intentionally ignore dark mode.
- [ ] PDF export (feature 7) should reuse `ResumeSheet` with `highlight={false}` on A4 and print the same page breaks (`paginate` output) so the PDF matches the viewer page for page.
- [ ] Consider showing the template picker in the editor once the editor has a live preview (out of scope here).
- [ ] Keep the Figma file in step with the components when a template changes.
