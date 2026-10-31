# 0004. AI usage limit and credit balance: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md`; this file explains why.

## Context

AI resume writing (spec 0003, and import in feature 6) is the part of the app that will be paid for. The scope says the first 5 uses are free and every use after that needs a credit, while analysis, job match, interview questions, and cover letters stay free. Payments do not exist yet: the pricing page (feature 5) will show plans, and Buy will only say "coming soon". So this feature has to count uses, enforce the limit, show the balance, and hold credits that can only be added by hand for now.

Forces at play:

- **The limit must hold on the server.** The editor runs in the browser; anything enforced only there can be skipped with a direct server action call.
- **Requests run in parallel.** The same user can have two tabs open, and on Vercel two requests can land on different server instances. The existing `checkCooldown` map lives in process memory and is not shared, so it cannot be the guard.
- **The AI fails often.** Free OpenRouter models time out, rate limit, and sometimes return answers `cleanSectionSuggestion` rejects. Charging for those would feel unfair and drain a 5 use allowance quickly.
- **Money is coming.** Credits will be bought later, so every change to a balance needs to be explainable after the fact, and the deferred "Credit history" item will want a list of changes.
- **One entry point already exists.** Spec 0003 routed every AI writing request through `writeResumeSection` precisely so this feature could count in one place.
- **Better Auth owns `User`.** Adding columns there mixes app data into the auth model.
- **Conventions**: Prisma on Neon Postgres with `prisma db push` (no migrations folder), server actions through `withAction`, Amber Walnut theme tokens, Alpha rigor, small team.

Engineer decisions taken as fixed requirements: a use counts only when the AI returns a usable answer (including "No changes suggested"); every request counts, Try again and chips included; 5 free uses once per account; 1 per use for every kind, import included; balance shown only in the editor, free uses first then credits, with a cost note and a warning at 1 left; out of uses makes buttons unavailable with a pricing link; credits added by a plain `.mjs` script; the free allowance is a code constant; the ledger keeps `resumeId` as plain text; the `/pricing` link ships before the page exists; an abandoned but completed request stays charged.

## Options considered

### Option 1: Counter row plus ledger, reserve then refund

A 1:1 `AiBalance` row holds `freeUsed` and `credits`. Before the AI call, one SQL statement takes a free use or a credit with a conditional `UPDATE` (it only matches while one is left) and writes an `AiLedger` row in the same statement. A failed AI step writes a `REFUND` row and gives the use back, again in one statement.

**Pros**:
- The database enforces the limit under any concurrency, with no explicit locks.
- Reading the balance is one primary key lookup.
- Full audit trail; credit history is free later.
- Users never pay for failures.

**Cons**:
- Two writes per failed request (reserve and refund) and the refund path itself can fail.
- Counter and ledger are two representations that must change together (kept in one SQL statement per change).

### Option 2: Ledger only, balance computed by summing

No counters. Every grant, use, and refund is a ledger row, and the balance is the sum of the user's rows.

**Pros**:
- One source of truth; the balance can never drift from the history.
- Simplest schema.

**Cons**:
- Every check is an aggregate query that grows with history.
- Making two parallel requests safe needs a lock (`SELECT ... FOR UPDATE` on a per user row or an advisory lock), which brings back a per user row anyway and is easy to get subtly wrong.

### Option 3: Columns on User, check then charge after success

Add `aiFreeUsed` and `aiCredits` to `User`. Read the balance, call the AI, and charge only after a usable answer.

**Pros**:
- No refunds needed, fewest writes.
- No new table.

**Cons**:
- Two parallel requests can both pass the check, so a user at 0 gets extra uses (the scope's "the 6th use is blocked on the server" breaks under races).
- Mixes billing data into the Better Auth model.
- No history to explain a balance.

### Option 4: External usage metering (a billing provider's metered usage)

Report each use to a payment provider's metering API and let it hold the balance.

**Pros**:
- Ready made invoicing and history once payments exist.

**Cons**:
- Payments are explicitly deferred; this adds an external dependency, credentials, and network failure modes for a feature that today only counts to 5.
- The limit check would depend on a third party call on every AI request.

## Rationale

Option 1 is the only one that makes "the 6th use is blocked on the server" true under the real concurrency this app has: two tabs, and serverless instances that do not share the in memory cooldown. Putting the condition in the `WHERE` clause of a single `UPDATE` lets Postgres row locking do the work, which is the boring, well understood way to decrement a balance safely. Doing each change (with its ledger row) as one raw SQL statement instead of a Prisma interactive transaction was added after a cross check: the app reaches Neon through its pooled host, where interactive transactions need extra connection flags and their short default timeouts can fail on a cold start, and Prisma's `upsert` can race on a user's first use. One statement per change avoids both, costs one round trip, and keeps the race safety. The price is a few lines of hand written SQL that Prisma's types do not check. Option 3 is simpler but fails exactly that requirement, and Option 2 needs the same per user row plus a lock to get there, so it ends up more complex than Option 1 for no gain.

Reserving before the AI call and refunding after a failure follows from two engineer decisions together: failed requests must be free, and parallel requests must never overspend. Charging after success (Option 3's order) gives the first without the second. The refund can fail, which is accepted as a logged, rare gap that the ledger makes visible, rather than a reason to weaken the limit.

The ledger is worth its small cost because these balances will soon represent money. Disputes, the deferred credit history, and later payment webhooks all need to explain how a number came to be; adding that history after real purchases exist is much harder than writing one row per change from the start. Keeping both tables off `User` leaves Better Auth's model alone, and keeping `resumeId` as plain text means deleting a resume can never rewrite billing history. Option 4 is the right shape only once payments exist; until then it adds a third party to every AI request for no user visible benefit.
