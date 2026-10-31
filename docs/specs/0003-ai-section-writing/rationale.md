# 0003. AI section writing: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md`; this file explains why.

## Context

The editor from spec 0002 lets people fill a resume by hand, but most people struggle to write a sharp summary and achievement bullets. The scope's second slice adds AI help per section: write or rewrite a section from what the user entered, review it, accept or discard it, and keep editing. Accepted text must save like a manual edit, and an AI failure must leave the section untouched.

Forces at play:

- **The editor holds unsaved state.** Users will ask for help right after typing, before saving, so the AI has to work from the form's current values, not the database.
- **The form is the single source of truth.** Spec 0002 made `saveResumeContent` the only write path, with validation, a version check, and draft rules. Anything that writes content elsewhere would bypass those.
- **AI invents facts.** Resume models happily produce "increased revenue by 35%". On a real resume that is a liability for the user.
- **The AI client caches aggressively.** `callAI` replays identical prompts for 5 minutes and recent results by `dedupKey` for 30 seconds, failures included, so "Try again" would return the same text unless the request changes.
- **Free models are slow and rate limited.** Parallel requests raise 429s; a 30 second timeout is real.
- **Credits are coming** (feature 4): every AI writing use will be counted, so the number of server entry points matters.
- **Conventions**: server actions through `withAction`, `callAI<T>` with JSON output, Zod `safeParse` with `<path>: <message>` errors, Amber Walnut tokens, Alpha rigor, small team.

## Options considered

### Option 1: One server action, suggestions in page state, Accept sets form values

A single `writeResumeSection` action takes a typed target (summary, entry bullets, skills) plus a context string built from the current form, calls the AI, cleans the answer, and returns it. The editor shows it inline; Accept calls `setValue`; Save stores it as usual.

**Pros**:
- No database writes; spec 0002's save path keeps all its guarantees.
- Works on unsaved edits.
- One entry point for feature 4 to count and gate.
- Small surface to secure: one action, owner checked, cooldown.

**Cons**:
- Suggestions vanish on reload.
- The server must trust the client built context text (length capped only).

### Option 2: Server side draft per section (stored suggestions)

Like the whole resume improve draft in spec 0001: the action stores a per section draft on the resume; the UI accepts or discards it via further actions.

**Pros**:
- Suggestions survive reloads and tab switches.
- The server works from stored content only, no client context.

**Cons**:
- Works only on saved content, so users must save before asking for help.
- New columns or a table, plus accept and discard actions and race handling against `contentUpdatedAt`, mirroring spec 0001's complexity per section.
- Accept would write content outside `saveResumeContent`, or need yet another conditional write path.

### Option 3: One action per target kind

Separate `writeSummary`, `writeBullets`, `suggestSkills` actions.

**Pros**:
- Each action has a narrow, simple input type.

**Cons**:
- Three entry points to secure, cool down, and later count for credits.
- Shared logic (ownership, cooldown, context, cleaning) duplicated or pulled into helpers anyway.

### Option 4: Stream the answer into the field

Stream tokens from the model straight into the summary or bullet inputs.

**Pros**:
- Feels fast; the user sees text appear.

**Cons**:
- `callAI` is request and response JSON only; streaming means a new client path, new error handling, and no JSON validation before text reaches the form.
- Writing into fields as it streams overwrites the user's text before they agree, the opposite of the chosen review step.

## Rationale

Option 1 fits the two strongest forces: the editor's unsaved state and spec 0002's single write path. Because suggestions only become form values on Accept, everything the user stores still goes through `saveResumeContent` with its validation and version check, and the AI never touches the database. Stored drafts (option 2) would force a save before every request and duplicate the race handling spec 0001 needed for one draft, for every section. One action over three (option 3) keeps ownership, cooldown, and cleaning in one place and gives feature 4 exactly one place to count uses. Streaming (option 4) would skip validation and the review step, which matters most given how readily models invent metrics.

The no inventing rule is a prompt rule backed by visible placeholders and an explicit review, plus a non blocking warning on save; blocking saves on brackets was rejected because legitimate bracketed text would get stuck. A fresh random nonce in both the prompt and the dedup key is the smallest change that makes Try again honest under the existing client caches, without touching `lib/ai/client.ts`. Keeping Contact out of the context is free privacy: the writing never needs a phone number or email.

Smaller calls from the conversation: one request at a time (fewer 429s, simpler UI, clear counting later), preset style chips instead of free text (predictable prompts, less injection surface), skills accept that only adds (never loses what the user typed), a 3 second cooldown (stops hammering without making Try again feel slow), the target role as page state (no schema change), and matching the resume's language.
