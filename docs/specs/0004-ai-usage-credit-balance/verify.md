# Verify: AI usage limit and credit balance · spec 0004 · updated 2026-10-31
_Steps derived from spec 0004 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones. You need two accounts (A and B), a built resume and an uploaded resume for A, the dev server (`npm run dev`), and Prisma Studio or a query tool to read `AiBalance` and `AiLedger`._

## UI / manual

### Balance line and counting
- [ ] As a new user, open a built resume's editor → the target role box header reads "5 free AI uses left · each AI request uses 1"; no `AiBalance` row exists yet → AC-7, AC-11
- [ ] Press Write with AI on the summary → after the answer the line reads "4 free AI uses left · each AI request uses 1" without a reload; `AiLedger` has a `FREE_USE` row, amount −1, purpose `SUMMARY`, this resume id → AC-1, AC-5, AC-7
- [ ] Press Try again, then a style chip → the line drops to 3, then 2 (each request counts) → AC-1
- [ ] A request that answers "No changes suggested" or "No new skills found" also drops the line by 1 → AC-1
- [ ] Bullets and Suggest skills write ledger rows with purpose `BULLETS` and `SKILLS` → AC-1, AC-5

### Credits, warning, out of uses
- [ ] Use up all 5 free uses, then `npm run credits:grant -- <A's email> 2 test` → prints "<email>: 2 credits"; a `GRANT` row (+2, note "test"); reload → the line reads "2 credits · each AI request uses 1" (free uses not shown) → AC-6, AC-7, AC-5
- [ ] One AI request → "1 credit · each AI request uses 1 · See pricing" in the warning color; a `CREDIT_USE` row → AC-1, AC-8
- [ ] One more request → the line reads "No AI uses left · See pricing"; every AI button is `aria-disabled` with the hint "No AI uses left. See pricing"; the open panel's Try again and chips are unavailable → AC-9
- [ ] On an empty experience entry at 0 uses → the pricing hint shows, not "Add a job title or company first." → AC-9
- [ ] "See pricing" links point to `/pricing`, and the server log shows no request for `/pricing` until one is clicked (no prefetch) → AC-8, AC-9

### Two tabs and the server block
- [ ] With 1 use left, open the editor in two tabs; spend it in tab 1; press an AI button in tab 2 (still showing 1) → its panel shows "You have used your 5 free AI uses. Get credits to keep writing with AI." with "See pricing" and Discard only; the form is unchanged; its line switches to "No AI uses left · See pricing"; no new ledger row → AC-3, AC-9

### Failures are free
- [ ] Start the dev server with `OPENROUTER_BASE_URL=http://127.0.0.1:9/api/v1` and press Write with AI → the panel shows the error; the line is unchanged; the ledger has the `FREE_USE` and a `REFUND` row (+1) whose `refundOfId` is that use → AC-2, AC-5
- [ ] Press Write with AI twice within 3 seconds (replay the request), on an uploaded resume id, with an empty target and context, and with B's session on A's resume → each returns its spec 0003 error and writes no ledger row → AC-2, AC-12

### Free features
- [ ] At 0 uses, run ATS analysis, job match, interview questions, Improve Resume, and a cover letter analysis → all work; `AiBalance` and `AiLedger` are unchanged → AC-10

### Layout
- [ ] At 375px the balance line wraps under the target role label, the out of uses hint fits under the AI button, and the page has no sideways scroll → AC-7, AC-9

## Value sourcing checks
- [ ] The user comes only from the session: `getAiBalanceForUser` takes no arguments, and no action accepts a user id → AC-12
- [ ] Free before credit: with `freeUsed` 4 and `credits` 3, one request makes it 5 and 3 (a `FREE_USE`), the next 5 and 2 (a `CREDIT_USE`) → AC-1
- [ ] `balance` in the result is the reserve's own view: the line after a request equals the row right after that request → AC-7
- [ ] A late answer still moves the balance: delay a request past the 100 second watchdog (route delay in the browser); when the server finishes, the line drops by 1 even though the panel shows "The AI took too long" → AC-7
- [ ] Missing `AiBalance` row reads as 5 free, 0 credits; the edit page shows no balance line if `getAiBalanceForUser` fails → AC-11, AC-7
- [ ] The refund reverses the right counter: refunding a `CREDIT_USE` adds a credit back, a `FREE_USE` lowers `freeUsed` → AC-2
- [ ] Ledger ids are UUIDs written by code (raw inserts), all unique → AC-5

## Commands
- [ ] `npm run credits:grant` with no email, `0`, `-3`, `2.5`, `1e3`, `0x10`, `10001`, or an unknown email → a clear error, exit code 1, no `AiBalance` or `AiLedger` change → AC-6
- [ ] `npm run credits:grant -- "  Verify-A@Example.test " 3 beta tester` → finds the account, prints the stored total, writes one `GRANT` row with note "beta tester" → AC-6, AC-5
- [ ] Concurrency scratch script (calls `reserveAiUse` directly): 5 parallel first uses on a user with no row → 5 successes, `freeUsed` 5, no error; with exactly 1 credit, 3 parallel reserves → exactly 1 success and 2 `AI_LIMIT_REACHED`; `credits` 0 → AC-4
- [ ] Refund twice, refund another user's ledger id, refund a `GRANT` id → only the first refund changes anything; `REFUND` rows per use ≤ 1 → AC-2, AC-5
- [ ] Counters match the ledger for a user after the steps above (`freeUsed` = free uses − their refunds; `credits` = grants − credit uses + their refunds) → AC-5
- [ ] `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` → clean (the Better Auth `headers()` notes are old) → all

## Acceptance-criteria coverage
- AC-1 Balance 2 to 5, Credits 2 · AC-2 Failures 1, 2, Commands 4 · AC-3 Two tabs · AC-4 Commands 3 · AC-5 Balance 2, 5, Credits 1, Failures 1, Commands 2, 4, 5 · AC-6 Credits 1, Commands 1, 2 · AC-7 Balance 1, 2, Credits 1, Layout, Value sourcing 3 to 5 · AC-8 Credits 2, 5 · AC-9 Credits 3 to 5, Two tabs, Layout · AC-10 Free features · AC-11 Balance 1, Value sourcing 5 · AC-12 Failures 2, Value sourcing 1
