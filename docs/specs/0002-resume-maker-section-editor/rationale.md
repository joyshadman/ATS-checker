# 0002. Resume maker: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md`; this file explains why.

## Context

Spec 0001 gave a resume a structured shape (a validated JSON document of sections) and the server actions to create, save, and load it, but there is still no way for a person to fill it in. Every resume today comes from an uploaded file. The scope's next slice is the thin thread every later feature thickens: create a resume, fill each section by hand, save, leave, and come back to the same content, with nobody else able to open it. AI section writing (feature 3), import (feature 6), and PDF export (feature 7) all assume this editor exists.

The forces at play:

- **Saves have side effects.** In 0001, each content save changes `contentUpdatedAt`, which makes every cached analysis and interview stale and clears any AI improvement draft. How often the editor saves therefore decides how often the user loses a draft and how often AI work is redone.
- **The document is nested and ordered.** Up to 30 entries per section, up to 12 bullets per entry, and order matters (most relevant job first). Add, remove, and reorder at two levels must be reliable and accessible.
- **Validation rules already exist** in one Zod schema on the server. If the browser checks different rules, users get errors only after pressing Save, or worse, client and server disagree.
- **More than one writer exists.** The same resume can be open in two tabs, and accepting an AI draft on the detail page writes `content` too. 0001 left saves as last write wins.
- **The app's conventions**: server actions through `withAction`, Next.js 16 App Router (async `params`), plain `FormData` forms elsewhere, Amber Walnut theme tokens only, a small team, Alpha rigor. React Hook Form and its Zod resolver are installed but unused.

0001 also handed this feature some loose ends: where to accept or discard an AI draft for a built resume, how built resumes appear next to uploads, and whether to mark old analyses as out of date.

## Options considered

### Option 1: One client form, explicit save, version checked write (inside `/resumes`)

The whole document is one React Hook Form on `/resumes/[id]/edit`, with `useFieldArray` per list and the existing Zod schema as the validator. The user presses Save; one server action writes title and content together, only if `contentUpdatedAt` still matches what the editor loaded.

**Pros**:
- One atomic write per save; drafts and AI caches are invalidated only when the user means to.
- Field arrays give add, remove, and move for free; one schema drives client and server errors.
- The version check closes the two tab and accepted draft overwrite holes with one extra `where` clause.
- Built and uploaded resumes share one list and detail page, so every AI feature works on both.

**Cons**:
- Unsaved work is lost on a crash; the user must remember to save (mitigated by the leave guard).
- A conflict means reload and redo; no merge.
- Adds a form mapping layer (bullets as objects, skills as text).

### Option 2: Autosave with a hand written state document

A `useState`/`useReducer` document saved automatically a couple of seconds after typing stops.

**Pros**:
- Nothing is ever lost; no Save button to forget.
- No form library or mapping layer.

**Cons**:
- Every pause clears the AI draft and invalidates cached analyses (0001 side effects).
- Half typed entries fail validation constantly, so autosave either errors or must skip, which confuses "is this saved?".
- Reorder, nested lists, and per field errors are all hand written.

### Option 3: Save per section

Each section card has its own Save and its own small action that patches just that part of the JSON.

**Pros**:
- Smaller writes; an error in one section does not block saving another.
- Feels natural for long resumes.

**Cons**:
- Many write paths into one JSON column, each needing to re-validate the whole document and re-render `contentText`, the exact invariant 0001 warns about.
- Several saves per session means several draft clears and cache resets.
- More actions to secure and test.

### Option 4: Edit in place on the detail page

Make `/resumes/[id]` itself editable, with no new routes.

**Pros**:
- Fewest routes; edit and analyze in one place.

**Cons**:
- Mixes a large form with analysis, interview, and improve panels, and their refresh behaviour.
- Goes against the scope's "own routes" note, and makes the leave guard fight with the page's own action buttons.

## Rationale

Option 1 wins because the dominant force is that saves have side effects. Autosave (option 2) and per section saves (option 3) would both multiply writes, and every write wipes the AI draft and stale marks every cached analysis. Saving on purpose keeps the user in control of when that happens, which matters more here than never losing a keystroke; the leave guard covers the common way edits are lost (clicking away), and the remaining gaps (crash, Back button) are acceptable at Alpha.

Using React Hook Form, which the project already installed, rather than hand written state, is a reuse call: `useFieldArray` solves add, remove, and move at two levels, and a custom resolver can run the exact server schema, so client and server can never disagree. The runner up was a `useReducer` document, simpler to read but with all the error plumbing written by hand. The thin `lib/resume/form.ts` mapping is the price, and keeping it in one file keeps it honest.

The version check is cheap insurance: 0001 already uses the same conditional write for accepting drafts, and without it an old tab would silently undo an accepted AI draft. Keeping the editor inside `/resumes` (not a separate builder area) means one library, one detail page, and the existing AI actions work on built resumes with no extra wiring.

Smaller calls made in the conversation: move up and down buttons rather than drag and drop (no dependency, accessible by default; drag can come later), native month inputs (they already produce `YYYY-MM`), comma separated skills (fast to type and paste), no preview (feature 7 owns the real look), and Accept/Discard on the detail page where Improve already runs.
