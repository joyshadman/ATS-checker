# 0004. AI usage limit and credit balance: a reserved charge per AI writing request, with a ledger

**Date**: 2026-10-31
**Status**: In Progress

## Summary

Every AI writing request (section writing today, import later) now costs one use. Each account gets 5 free uses for life, and after that each use takes one credit. The server takes the use before it calls the AI and gives it back if the request fails, so people only pay for answers they actually see, and two tabs can never overspend. The balance shows in the editor, the buttons turn off with a link to pricing when it runs out, and credits are added by a small script until real payments exist.

## Requirements

**User stories**:
- As a job seeker, I want a few free AI writing uses so that I can try the feature before paying.
- As a job seeker, I want to see how many AI uses I have left so that running out never surprises me.
- As a job seeker, I want failed AI requests to cost me nothing so that I only pay for answers I get.
- As the owner, I want every AI writing use counted on the server so that the free tier cannot be bypassed and paid credits are spent correctly.
- As the owner, I want to add credits to an account by hand so that I can test the paid path and reward early users before payments exist.

**Acceptance criteria**:
- **AC-1**: Each `writeResumeSection` request that returns a usable answer (a suggestion, "No changes suggested", or "No new skills found") uses exactly one AI use: a free use while fewer than 5 have been used, otherwise one credit. Every request counts the same way, including Try again and the style chips.
- **AC-2**: A request that fails uses nothing. Rejections before the AI call (cooldown, invalid input, not the owner, uploaded resume, "Add some details first", limit reached) never charge. A use reserved before the AI call is given back when the AI step fails (AI error, timeout, rate limit, or "The AI answer could not be used"), and the refund is recorded.
- **AC-3**: When the user has used all 5 free uses and has 0 credits, `writeResumeSection` returns "You have used your 5 free AI uses. Get credits to keep writing with AI." without calling the AI and without changing the balance or the ledger.
- **AC-4**: Requests running at the same time (two tabs, two server instances) never spend more than the balance: `freeUsed` never goes above 5 and `credits` never goes below 0.
- **AC-5**: Every balance change writes exactly one `AiLedger` row in the same database transaction as the change: `FREE_USE` or `CREDIT_USE` with amount −1, the purpose, and the resume id; `REFUND` with amount +1 pointing at the use it reverses (a use can be refunded at most once); `GRANT` with amount +N and an optional note.
- **AC-6**: `npm run credits:grant -- <email> <amount> [note]` adds `amount` credits (a whole number from 1 to 10000) to the user with that email and prints the new balance. An unknown email or a bad amount prints a clear error, exits with a non zero code, and changes nothing.
- **AC-7**: The editor shows a balance line in the target role box header: free uses while any remain ("3 free AI uses left"), and only once they are gone, credits ("12 credits"), each followed by "each AI request uses 1", with singular forms for 1 ("1 free AI use left", "1 credit"). It is loaded with the page (no line if that load fails) and updated after every charged AI request, including one whose answer arrived after the editor gave up on it, without a reload.
- **AC-8**: When exactly 1 use is left in total (free plus credits), the balance line uses the warning color and adds a "See pricing" link to `/pricing`.
- **AC-9**: With no uses left, every AI button is unavailable (`aria-disabled`) with the visible hint "No AI uses left. See pricing", where "See pricing" links to `/pricing`; this hint replaces the spec 0003 AC-6 hints. If the server blocks a request anyway (another tab spent the last use), the panel shows the AC-3 message with a "See pricing" link and Discard (no Try again), the form stays unchanged, and the balance line switches to the out of uses state.
- **AC-10**: ATS analysis, job match, interview questions, Improve Resume, and every cover letter feature never read, check, or change the AI balance.
- **AC-11**: New and existing users start with 5 free uses and 0 credits. No `AiBalance` row is needed until the first use; a missing row reads as 0 used and 0 credits.
- **AC-12**: The balance belongs to the signed in user from the session only. No server action takes a user id or lets the browser change credits; credits are added only by the grant script (later, the payment flow).

## Decision

**Chosen option**: Option 1: A per user `AiBalance` counter row plus an `AiLedger` history table, with the use reserved in one atomic database update before the AI call and refunded on failure.

`writeResumeSection` (and later import) calls `reserveAiUse` after its own checks and before `callAI`; a failed AI step calls `refundAiUse`; the successful result carries the new balance back to the editor.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (Prisma, applied with `npx prisma db push`; this project has no migrations folder):

```prisma
enum AiLedgerKind {
  FREE_USE
  CREDIT_USE
  GRANT
  REFUND
}

enum AiPurpose {
  SUMMARY
  BULLETS
  SKILLS
  IMPORT
}

model AiBalance {
  userId    String   @id
  freeUsed  Int      @default(0)
  credits   Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AiLedger {
  id         String       @id @default(cuid())
  userId     String
  kind       AiLedgerKind
  amount     Int
  purpose    AiPurpose?
  resumeId   String?
  refundOfId String?      @unique
  note       String?
  createdAt  DateTime     @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

`User` gets the two back relations (`aiBalance AiBalance?`, `aiLedger AiLedger[]`); no column is added to `User`, so Better Auth's model is otherwise untouched. `AiLedger.resumeId` is plain text on purpose (no foreign key): deleting a resume never touches billing history. `refundOfId` is the id of the `FREE_USE` or `CREDIT_USE` row a `REFUND` reverses; its unique constraint makes a second refund of the same use fail.

**Shared constants** (`lib/ai/credits-shared.ts`, no imports, safe for the browser and the server):

- `AI_FREE_USES = 5`, `PRICING_PATH = "/pricing"`, `AI_LIMIT_REACHED = "You have used your 5 free AI uses. Get credits to keep writing with AI."` (built from `AI_FREE_USES`), `AI_BALANCE_UNAVAILABLE = "Could not check your AI balance. Try again."`.
- `type AiBalanceView = { freeLeft: number; credits: number }`.
- `balanceTotal(b) = b.freeLeft + b.credits`.

**Charge rules** (`lib/ai/credits.ts`, server only: it imports Prisma and has no `"use server"`, so none of it is callable from the browser). Every write is a single SQL statement through `prisma.$queryRaw` (tagged template, parameters bound), never a Prisma interactive transaction: the app connects through Neon's pooled host, where interactive transactions need extra URL flags and their 2 s wait and 5 s timeout defaults can fail on a cold start. A single statement is atomic on its own, takes one round trip, and its `WHERE` condition is rechecked under the row lock, so concurrent requests stay safe (AC-4). Ledger ids are generated in code with `crypto.randomUUID()` (the Prisma `cuid()` default does not apply to raw inserts).

- `getAiBalance(userId): Promise<AiBalanceView>`: Prisma `findUnique`; missing row → `{ freeLeft: 5, credits: 0 }`; `freeLeft = max(0, AI_FREE_USES − freeUsed)`.
- `reserveAiUse(userId, purpose, resumeId): Promise<{ ledgerId: string; balance: AiBalanceView }>`, up to three statements, each atomic:
  1. Ensure the row: `INSERT INTO "AiBalance" ("userId", "freeUsed", "credits", "createdAt", "updatedAt") VALUES (…, 0, 0, now(), now()) ON CONFLICT ("userId") DO NOTHING`. Two tabs on a first use cannot collide.
  2. Free use, one statement: a CTE `u` that runs `UPDATE "AiBalance" SET "freeUsed" = "freeUsed" + 1, "updatedAt" = now() WHERE "userId" = $user AND "freeUsed" < $AI_FREE_USES RETURNING "freeUsed", "credits"`, a CTE `l` that runs `INSERT INTO "AiLedger" (id, "userId", kind, amount, purpose, "resumeId", "createdAt") SELECT $id, $user, 'FREE_USE', -1, $purpose, $resumeId, now() FROM u RETURNING id`, then `SELECT` both. A row back → done.
  3. Otherwise the same statement shape for a credit: `SET "credits" = "credits" - 1 … WHERE "userId" = $user AND "credits" > 0`, ledger kind `CREDIT_USE`. A row back → done.
  4. Otherwise throw `AI_LIMIT_REACHED` (nothing was written).
  Any error other than the limit is logged and rethrown as `AI_BALANCE_UNAVAILABLE`, so a database failure never shows raw Prisma text and never charges.
- `refundAiUse(userId, ledgerId): Promise<void>`, one statement: a CTE `use` selects the ledger row where `id = $ledgerId AND "userId" = $user AND kind IN ('FREE_USE', 'CREDIT_USE')`; a CTE `r` inserts the `REFUND` row (amount +1, `refundOfId` = that id, same purpose and resumeId) `ON CONFLICT ("refundOfId") DO NOTHING RETURNING "refundOfId"`; a CTE `b` updates `AiBalance` (`freeUsed = GREATEST(0, "freeUsed" - 1)` for a `FREE_USE`, `credits = "credits" + 1` for a `CREDIT_USE`) joined on `r`, so the counter moves only when the refund row was actually inserted. A second refund of the same use, or a ledger id of another user or of a grant, changes nothing. Any error is logged with the ledger id and swallowed, so the user still sees the original AI error (the ledger shows the gap).
- Granting lives only in the script (below), not in `lib/`, so no app code path can grant.

**`writeResumeSection` order** (changes to spec 0003's rules, everything else stays):
1. `withAction` with the `ai-write` cooldown (unchanged).
2. Input validation, `loadResumeWithAuth`, the "This resume has no sections" check, the coarse precondition (unchanged; all before any charge, so they are free).
3. `reserveAiUse(userId, purposeOf(target), resumeId)`; `AI_LIMIT_REACHED` (or `AI_BALANCE_UNAVAILABLE`) is thrown from here, before any AI call (AC-3).
4. `callAI` (unchanged). On `!aiResult.success`: `refundAiUse(userId, ledgerId)`, then throw the AI error.
5. `cleanSectionSuggestion` (unchanged). If it throws: `refundAiUse(userId, ledgerId)`, then rethrow.
6. Return `{ suggestion, balance }`, where `balance` is the view returned by step 3.
`purposeOf`: `summary` → `SUMMARY`, `bullets` → `BULLETS`, `skills` → `SKILLS`. Import (feature 6) calls the same pair with `IMPORT`.

Notes on the existing guards: the `ai-write` cooldown is stamped before the reserve, so a request blocked by the limit still uses up the 3 second window (harmless). The nonce makes every honest request reach the AI; a caller who replays a nonce on purpose gets `callAI`'s cached answer and is charged again for it, which only costs that caller, so the server does not check nonce reuse. The edit page route sets `export const maxDuration = 120`, so on Vercel the action outlives the editor's 100 second watchdog instead of being killed between the reserve and the refund.

**API surface** (server actions through `withAction`, authenticated, the user from the session):

| Action | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `writeResumeSection(input)` (changed) | server action | unchanged from spec 0003 | `{ suggestion: SectionSuggestion, balance: AiBalanceView }` | signed in, resume owner | `AI_LIMIT_REACHED`, plus every spec 0003 error |
| `getAiBalanceForUser()` (new, `actions/credits.ts`) | server action | none | `AiBalanceView` | signed in | "Unauthorized" |
| `npm run credits:grant -- <email> <amount> [note]` (new) | Node script `scripts/grant-credits.mjs`, run as `node --env-file=.env scripts/grant-credits.mjs` | email, whole number 1 to 10000, optional note | prints `email: N credits` | shell access to the database only | unknown email, bad amount: non zero exit, nothing written |

The grant script uses `@prisma/client` directly with the same single statement pattern: it lowercases and trims the email and finds the user (none → error); accepts the amount only if it matches `^\d+$` and is from 1 to 10000 (so `1e3`, ` 5`, `0x10`, `2.5`, and negatives are rejected); cuts the note to 200 characters; ensures the `AiBalance` row (`ON CONFLICT DO NOTHING`); then one CTE increments `credits` and inserts the `GRANT` row (amount +N, note), returning the new `credits`, which it prints as `email: N credits`. It disconnects Prisma in a `finally` block on every exit path and exits with code 1 on any error (AC-5, AC-6).

**Editor UI** (spec 0003's components, theme tokens only):

| Piece | Change |
|---|---|
| `app/(dashboard)/resumes/[id]/edit/page.tsx` | Loads `getAiBalanceForUser()` next to `getResumeContent` and passes `initialBalance: AiBalanceView \| null` to `ResumeEditor` (`null` when the load failed). Exports `maxDuration = 120`. |
| `ai-writing.tsx` (provider) | Holds `balance: AiBalanceView \| null` seeded from `initialBalance`. In `finish()`, **before** the request id check: on success set `balance` from `result.data.balance`; on the `AI_LIMIT_REACHED` error set it to `{ freeLeft: 0, credits: 0 }`. The request id check then gates only the panel update, so a late or abandoned answer still moves the balance it was charged for. Exposes `balance` and `outOfUses` (`balance !== null && balanceTotal(balance) === 0`). |
| `target-role-box.tsx` | Header gets the balance line (`role="status"`, `aria-live="polite"`). `balance === null` → no line. `freeLeft > 0` → "N free AI uses left · each AI request uses 1" (credits not shown while free uses remain). `freeLeft === 0 && credits > 0` → "N credits · each AI request uses 1". Singular "1 free AI use left", "1 credit". Total exactly 1 → warning color plus a "See pricing" link (AC-8). Total 0 → "No AI uses left · See pricing", no cost note. |
| `ai-button.tsx` | `outOfUses` makes it unavailable, ahead of the AC-6 precondition; its hint is "No AI uses left." plus a "See pricing" link, still tied by `aria-describedby` (AC-9). |
| `suggestion-panel.tsx` | Error equal to `AI_LIMIT_REACHED`: show the message, a "See pricing" link, and Discard only (AC-9). |

Every "See pricing" link is a Next `Link` to `PRICING_PATH` with `prefetch={false}`, so nothing requests `/pricing` before feature 5 serves it. Browser code imports only `lib/ai/credits-shared.ts`, never `lib/ai/credits.ts`.

**Value sourcing**:

| Action / screen | Value produced or displayed | Source |
|---|---|---|
| Any gated action | the user | session, via `withAction` |
| `reserveAiUse` | free or credit | `AiBalance.freeUsed < AI_FREE_USES` decides, else `AiBalance.credits > 0` |
| `reserveAiUse` | `purpose` | `purposeOf(target.kind)` from the validated input |
| `reserveAiUse` | `resumeId` on the ledger row | validated input `resumeId` (already owner checked) |
| `refundAiUse` | which counter to give back | `kind` of the ledger row named by `refundOfId` |
| `writeResumeSection` | `balance` in the result | the view returned by the same request's `reserveAiUse` transaction |
| Edit page | `initialBalance` | `getAiBalanceForUser()` → `AiBalance` row (missing row → 5 free, 0 credits) |
| Balance line | `freeLeft`, `credits` | provider `balance` state (seeded from `initialBalance`, replaced by each result) |
| Balance line | shown at all | `balance !== null` (edit page load succeeded) |
| Balance line | warning state | derived: `balanceTotal(balance) === 1` |
| AI buttons, panel | out of uses | derived: `balanceTotal(balance) === 0`, or the `AI_LIMIT_REACHED` error |
| Limit message, links | text and target | `AI_LIMIT_REACHED`, `PRICING_PATH` constants in `lib/ai/credits-shared.ts` |
| `refundAiUse` | which row to reverse | `ledgerId` returned by the same request's `reserveAiUse`, checked against `userId` |
| Ledger rows | `id` | `crypto.randomUUID()` in code (raw inserts) |
| Grant script | credits added | CLI argument `amount`; user from CLI argument `email` |

**Key invariants**:
- `0 ≤ AiBalance.freeUsed ≤ AI_FREE_USES` and `AiBalance.credits ≥ 0`, enforced by the conditional `UPDATE`s (the only writers besides the grant script).
- For every user, `freeUsed = (FREE_USE rows) − (REFUND rows of FREE_USE rows)` and `credits = (GRANT amounts) − (CREDIT_USE rows) + (REFUND rows of CREDIT_USE rows)`. Counter and ledger change in one SQL statement, so they never drift.
- A use is refunded at most once (`refundOfId` unique).
- Nothing is charged before every free check passes, and nothing is charged for a failed AI step.
- Only `writeResumeSection` (and later import) calls `reserveAiUse`.

**Security model**: The balance is private to its user and read only through the session. `lib/ai/credits.ts` has no `"use server"` directive, so its functions are not reachable from the browser; the only new server action, `getAiBalanceForUser`, takes no arguments and reads only the caller's balance. Credits can be added only by someone with shell and database access (the grant script). The ledger is the audit trail for every change of a value that will later be paid for. No PII is added; no compliance scope applies while payments do not exist.

**Configuration required**: none. The script reuses `DATABASE_URL` through `node --env-file=.env`.

**Critical test scenarios**:
- Happy path: a new user's balance line reads "5 free AI uses left · each AI request uses 1"; Write with AI on the summary → "4 free AI uses left", a `FREE_USE` ledger row with purpose `SUMMARY`; Try again → 3, verifies **AC-1**, **AC-5**, **AC-7**, **AC-11**.
- Credits: after 5 uses, grant 2 credits with the script → "2 credits"; one request → "1 credit" in the warning color with "See pricing"; one more → buttons unavailable with "No AI uses left. See pricing", verifies **AC-1**, **AC-6**, **AC-8**, **AC-9**.
- Limit on the server: at 0, call `writeResumeSection` directly → the AC-3 message, no `[AI]` line in the server log, no ledger row, verifies **AC-3**.
- Refund: make the AI fail (network block to OpenRouter, or an unusable answer from a scratch stub) → the panel error, the balance unchanged, a `REFUND` row pointing at the use, verifies **AC-2**, **AC-5**.
- Free rejections: cooldown, "Add some details first", uploaded resume, another user's resume → no ledger row, verifies **AC-2**, **AC-12**.
- Concurrency: with exactly 1 use left, fire 3 `reserveAiUse` calls at once from a scratch script → exactly 1 succeeds, 2 get the limit error, `freeUsed` is 5 and `credits` 0, verifies **AC-4**.
- Two tabs: tab 1 spends the last use; tab 2 (still showing 1) presses an AI button → the panel shows the limit message with "See pricing" and Discard, its balance line switches to out of uses, verifies **AC-9**.
- Free features: at 0 uses, run ATS analysis, job match, interview questions, Improve Resume, and a cover letter analysis → all work, no ledger rows, verifies **AC-10**.
- Grant errors: unknown email, `0`, `-3`, `2.5`, `abc` → error, non zero exit, nothing written, verifies **AC-6**.

## Build plan

Tracer Bullet: tasks 1 to 3 run one thin thread end to end (schema, the free use charge in the real action, the number on screen). Tasks 4 to 6 thicken it with credits, refunds, the out of uses state, and the grant path. One schema change, applied in task 1.

1. Add the `AiLedgerKind` and `AiPurpose` enums, the `AiBalance` and `AiLedger` models, and the `User` back relations to `prisma/schema.prisma`; run `npx prisma db push` and `npx prisma generate`; confirm both tables and the unique index on `refundOfId` exist in the live database, satisfies **AC-5**, **AC-11**.
2. Add `lib/ai/credits-shared.ts` (constants, `AiBalanceView`, `balanceTotal`) and `lib/ai/credits.ts` with `getAiBalance`, `reserveAiUse` (ensure row, then single statement free use or credit with its ledger row, `AI_BALANCE_UNAVAILABLE` on database errors), and `refundAiUse(userId, ledgerId)`; call `reserveAiUse` in `writeResumeSection` after the existing checks and return `{ suggestion, balance }`; update `ai-writing.tsx` to read the new result shape, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-10**, **AC-12**.
3. Add `actions/credits.ts` (`getAiBalanceForUser`), load it on the edit page (with `maxDuration = 120`), seed the provider's `balance`, update it from each result before the request id check, and render the balance line in the target role box header with the AC-7 wording, satisfies **AC-7**, **AC-11**, **AC-12**.
4. Refund on every failed AI step in `writeResumeSection` (AI error and unusable answer), with the `REFUND` row and the once only guard, satisfies **AC-2**, **AC-5**.
5. Out of uses: the warning state at 1, the unavailable AI buttons with the "See pricing" hint taking precedence over spec 0003's AC-6 hints, and the panel's limit state (message, link, Discard only) that also zeroes the provider balance, satisfies **AC-8**, **AC-9**, **AC-3**.
6. Add `scripts/grant-credits.mjs` and the `credits:grant` npm script (email lowercased, amount `^\d+$` from 1 to 10000, note cut to 200, one statement for balance plus `GRANT` row, prints the stored balance, clear errors, exit code 1, Prisma disconnected in `finally`), satisfies **AC-6**, **AC-5**.
7. Run `npx tsc --noEmit`, `npm run lint`, `npm run build`; run the concurrency scratch script; walk the critical test scenarios in the real app, satisfies **AC-1** to **AC-12**.

## Consequences

**Positive**:
- The free tier cannot be bypassed from the browser or by racing tabs; the database enforces it.
- Users never pay for a failed request, which matters while free models time out and rate limit.
- Every balance change is explainable from the ledger, and the deferred "Credit history" becomes a read of an existing table.
- Payments (deferred) plug in as one more `GRANT` writer; nothing else changes.
- Import (feature 6) reuses `reserveAiUse` and `refundAiUse` as is.

**Negative / tradeoffs**:
- Each AI request now does one extra small database transaction before the AI call and, on failure, one after it.
- Every Try again and style chip costs a use, so 5 free uses can be gone after one or two sections. That is a deliberate, honest pricing choice, but it may feel stingy; the balance line's "each AI request uses 1" is there so it is never hidden.
- A request the editor abandons after 100 seconds but the server finishes later is still charged, and the user never sees that answer (the balance line does update). The server's 30 second AI timeout with 2 retries makes this rare; the ledger shows it if a user asks.
- If the server function itself dies between the reserve and the refund (a crash or a platform kill despite `maxDuration = 120`), that use stays charged with no refund row. Accepted at Alpha; a reconciliation query (uses older than a few minutes with no answer marker) is possible later but not built now.
- The reserve and refund are hand written SQL through `$queryRaw`, so a later schema rename must update those statements too; Prisma's types do not check them.
- A refund that fails (database down right after an AI failure) is logged but lost; the user is out one use until someone fixes it by hand.
- Balances shown in other open tabs go stale until that tab makes a request or reloads; the server stays authoritative.
- `/pricing` does not exist until feature 5 ships, so the link shows the not found page in between.

**Neutral**:
- Two new tables and two enums; `User` gains only Prisma back relations, no columns.
- A first `scripts/` folder appears, with plain `.mjs` scripts run through `node --env-file=.env`.

## Follow-up

- [ ] Feature 5 (pricing page) must serve `/pricing`, the target of every link this feature adds.
- [ ] Feature 6 (import) must call `reserveAiUse(userId, "IMPORT", resumeId)` before its AI call and `refundAiUse` on failure.
- [ ] Spec 0003's AC-6 hint behavior is now preceded by this spec's out of uses hint (AC-9); `/sync` may note the precedence in the editor area's conventions.
- [ ] `/sync` should record `lib/ai/credits.ts` (the only place that charges), the `scripts/` folder, and `npm run credits:grant` in `lib/ai/AGENTS.md` and the root `AGENTS.md` commands.
- [ ] When real payments arrive (deferred), the payment webhook writes `GRANT` rows through the same transaction shape as the script, with an idempotency key per payment.
