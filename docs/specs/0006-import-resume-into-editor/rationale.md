# 0006 rationale: import an uploaded resume into the editor

## Context

Uploaded resumes (scope feature B) store one block of extracted text in `Resume.originalText`. The section editor (spec 0002), AI section writing (spec 0003), and the coming PDF export only work on the typed section document from spec 0001 (`Resume.content`). Today an upload opened in the editor shows "Opening it in the editor comes with import", so a user who already has a resume must retype it to use the maker. Scope feature 6 closes that gap, and its done line requires that the original upload stays intact.

The forces at play:
- Splitting free text into sections reliably needs a language model; uploads come from PDF and DOCX extraction with broken line wraps, odd bullets, and many date styles. The app already runs every AI call through `callAI` on free OpenRouter models, which today caps answers at 2048 tokens with a 30 s timeout and up to two retries. A whole resume written back as JSON can need several thousand tokens, and free models are slow.
- Spec 0004 already counts import as an AI use (purpose `IMPORT`) with a reserve before the call and a refund on failure. The edit route sets `maxDuration = 120` so a reserve is never cut off before its refund.
- The section schema is strict (required titles and companies, `YYYY-MM` dates, caps on bullets, entries, and lengths, http and https URLs only). Real resumes break these rules often: "2019" as a date, 15 bullets under a job, awards and volunteering with no matching section.
- An upload has history attached (analyses, interview questions, an improved text) that is keyed to its uploaded text. Anything that changes what that row's AI actions read invalidates that history.
- A user pays for each import, so a wasted or silently lossy import costs them real credits and trust.

Without this, the maker only helps people starting from nothing, and every existing user has to retype their resume before the new features are useful to them.

## Options considered

### Option 1: New linked copy, one AI call with its own budget, save then open (chosen)

`importResume` reserves a use, sends the upload text to the AI once with a larger token and time budget, cleans the answer into a valid document, and creates a new built resume with `importedFromId` pointing at the upload. The browser then opens that copy in the editor, where a notice lists anything that could not be placed.

**Pros**:
- The upload row is never written, so its analyses, interviews, and improved text keep meaning exactly what they meant.
- Reuses the editor as it is: the copy is an ordinary built resume with a normal version for the save check.
- One AI call is one charge with one refund path.
- The link makes "open the copy you already paid for" possible.

**Cons**:
- Two resumes in the list for one person's CV; importing again adds more.
- A single large AI call is the slowest and least forgiving step; with no retries, a provider hiccup fails the whole import (refunded).
- A bad split is already saved and paid for; the user edits or deletes it.

### Option 2: Import in place on the upload

Fill `content` on the uploaded resume itself, keeping `originalText` as the upload record.

**Pros**:
- One resume per CV; nothing new in the list and no link column.
- Fewer moving parts in the UI (the existing "Edit resume" button appears after import).

**Cons**:
- Once `content` is set, `getResumeText` switches every AI action to the section text, so the upload's analyses become out of date and the detail page's "Original Resume" panel shows the section text instead of the upload.
- The old `improvedText` stops showing, because built resumes use the structured improve path.
- There is no way back to "just the upload", which conflicts with "the original upload stays intact" in spirit even if `originalText` survives.

### Option 3: Parse into an unsaved editor, create on Save

The AI result opens in the editor without being stored; the resume is created only when the user presses Save.

**Pros**:
- Nothing is created until the user accepts the result.
- No clutter from abandoned imports.

**Cons**:
- The editor needs a new "create on save" mode with no version and no resume id, which also breaks AI section writing (spec 0003 requires a saved resume id) until the first save.
- Leaving or refreshing the page loses a paid import.
- The import notice would have to live only in memory.

### Option 4: Split the text without AI

A heuristic parser finds headings ("Experience", "Education"), dates, and bullets in the text.

**Pros**:
- Free, instant, and deterministic; no charge and no timeout.
- No PII sent to a third party for this step.

**Cons**:
- Resume layouts vary too much; heading names, columns from PDF extraction, and mixed date formats make a parser brittle, and a wrong split is worse than none.
- Building it well is a large project on its own, and the scope already decided import counts as an AI use.

## Rationale

Option 1 is the only option that keeps the upload exactly as it is, which the scope's done line asks for and which protects the analysis history the user already has. Option 2 meets the letter of "originalText is never written" but changes what every AI action reads for that row, which silently ages the user's results; that is a known trap in the 0001 design (`getResumeText` prefers sections). Option 3 is attractive for avoiding clutter, but it costs a new editor mode and loses paid work on a refresh; the clutter of Option 1 is cheap by comparison (a copy can be deleted), and the link lets the dialog steer people to the copy they already have instead of paying again.

One AI call with its own budget beats splitting the work into several calls under the current caps: a split call can half fail, is slower in total on free models, and makes "one import, one charge" harder to keep. Making the budget a per call option leaves every existing AI action exactly as it is. Retries are off for import because a 90 s attempt plus a retry cannot fit inside the 120 s route limit, and a refund is a better outcome than a function killed between the reserve and the refund (the failure spec 0004 guards against).

The import copies text word for word because improving is already the job of AI section writing and Improve, which the user runs on purpose and sees side by side. If import also polished, the user could not trust that their sections say what their resume said. The cleaner never invents data: an unclear date is left empty and noted rather than turned into January, a missing company becomes a visible `[Company]` placeholder (the spec 0003 convention), and anything past the caps goes to the notice. That keeps the strict schema intact while making every loss visible, which matters most when the user has paid for the import.

## Considered details (recommended, not asked)

- **Nonce in the prompt and dedup key**: "Import again" usually means the first result was poor, so it must reach the AI instead of replaying the 5 minute prompt cache (same approach as spec 0003). Runner up: let the cache replay, which would charge for an identical answer.
- **Separate `ai-import` cooldown key**: so section writing and import do not block each other. Runner up: share `ai-write`.
- **Resume list links to the edit page** instead of carrying its own dialog: the edit page's upload notice holds the button and the balance, so the list needs no extra data. Runner up: a dialog per row, which needs the balance and copy info for every row.
- **Notice always written on import**: the "check each section" reminder is worth showing even when nothing was left over. Runner up: write it only when something was left over.
- **Placeholders for missing required fields** instead of dropping the entry: the entry's dates and bullets are kept and the gap is visible. Runner up: move the whole entry to the notice.
