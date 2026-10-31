# 0005. Pricing page: a signed in dashboard page that lists credit packs from a code constant, with Buy showing a coming soon dialog

**Date**: 2026-10-31
**Status**: In Progress

## Summary

A new `/pricing` page inside the dashboard shows your current AI balance, the free tier, three credit packs with prices in US dollars, what costs a credit and what stays free, and a short FAQ. Pressing Buy opens a dialog saying payments are coming soon and that nothing was charged; no request is sent and no balance changes. The packs live in one typed list in code so real payments can reuse it later, and the page reuses the Amber Walnut theme and existing components, so it needs no new tables and no new server actions.

## Requirements

**User stories**:
- As a job seeker who ran out of AI uses, I want to see what credits cost so that I can decide whether to buy.
- As a job seeker, I want to know what uses a credit and what stays free so that I'm never surprised by my balance.
- As a job seeker, I want to see my current balance next to the packs so that I know how many I have left.
- As the owner, I want the pricing page live before payments exist so that every "See pricing" link works and I can show the offer.

**Acceptance criteria**:
- **AC-1**: The sidebar has a "Pricing" link, last in the main list (after Interview), to `/pricing`; it is the only highlighted link on that page. `/pricing` sits in the dashboard layout, so a signed out visitor is sent to `/auth/login` like every other dashboard page.
- **AC-2**: Every "See pricing" link added by spec 0004 (balance line, AI button hint, panel limit message) opens this page instead of the not found page.
- **AC-3**: The page shows, in this order: the header "Pricing", the balance card, the plan cards, the "What uses a credit" section, and the FAQ. The browser tab title is "Pricing".
- **AC-4**: The balance card shows the signed in user's balance with spec 0004's wording: "N free AI uses left" while any remain, otherwise "N credits", and "No AI uses left" at 0, with singular forms for 1, plus a link "Open Resume Maker" to `/resumes/new`. If the balance cannot be loaded, the card says "Your balance could not be loaded right now." and the rest of the page still renders.
- **AC-5**: The plan cards show a Free card ("Free", "$0", "5 AI uses, once per account", no Buy button) and the three packs from `CREDIT_PACKS`: Starter 20 credits for $4 ("$0.20 per credit"), Plus 60 credits for $10 ("$0.17 per credit", with a "Most popular" badge), Pro 150 credits for $20 ("$0.13 per credit"). Each pack card has a Buy button whose accessible name names the pack ("Buy Starter").
- **AC-6**: Pressing a Buy button opens a dialog titled "Payments are coming soon" with the text "You were not charged and your balance has not changed. Credit packs will be available to buy here soon." and a Close button. Close, Escape, and a click on the backdrop close it, and focus returns to the Buy button that opened it. No request is sent to the server, and `AiBalance` and `AiLedger` are unchanged.
- **AC-7**: "What uses a credit" says: AI writing in the Resume Maker (summary, bullets, skills) and importing a resume cost 1 use per request, Try again included; ATS analysis, job match, interview questions, Improve Resume, and cover letters are free; a failed AI request costs nothing; free uses are spent before credits.
- **AC-8**: The FAQ answers, as static text: "Do credits expire?" → "No. Credits never expire."; "What if an AI request fails?" → "You are not charged. The use is given back automatically."; "When can I buy credits?" → "Payments are coming soon. Until then the Buy buttons only show this notice."
- **AC-9**: The page uses theme tokens only (no raw Tailwind colors) and reads correctly in light and dark mode. At 375px wide the plan cards stack in one column with no sideways scrolling; from the `md` breakpoint they sit two per row, and from `xl` four in one row.

## Decision

**Chosen option**: Option 1: A server rendered dashboard route `/pricing` that reads the balance through spec 0004's `getAiBalanceForUser` and renders packs from a typed `CREDIT_PACKS` constant, with one small client component for the Buy dialog.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: none. No table, no column, no migration. Packs are a code constant:

```ts
// lib/pricing/packs.ts (no imports from server code; safe on both sides)
export type CreditPack = {
  id: "starter" | "plus" | "pro";
  name: string;        // "Starter", "Plus", "Pro"
  credits: number;     // 20, 60, 150
  priceCents: number;  // 400, 1000, 2000 (USD)
  popular: boolean;    // true only for "plus"
};
export const CREDIT_PACKS: readonly CreditPack[];
export function formatUsd(cents: number): string;      // "$4", "$10", "$0.17"
export function pricePerCredit(pack: CreditPack): string; // "$0.20 per credit"
```

`formatUsd` uses `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`, dropping the decimals for whole dollar amounts ("$4", not "$4.00"). `pricePerCredit` divides `priceCents` by `credits` and formats to 2 decimals, rounded to the nearest cent (400/20 → "$0.20", 1000/60 → "$0.17", 2000/150 → "$0.13").

**Shared balance wording**: add `balanceLabel(balance: AiBalanceView): string` to `lib/ai/credits-shared.ts` ("3 free AI uses left", "1 free AI use left", "12 credits", "1 credit", "No AI uses left"), and switch the editor's balance line (spec 0004, `target-role-box.tsx`) to it, so both places always say the same thing.

**Page structure** (`app/(dashboard)/pricing/page.tsx`, a server component; `metadata.title = "Pricing"`):

| Order | Section | Content |
|---|---|---|
| 1 | Header | `PageHeader` with a tag icon, title "Pricing", description "Get more AI writing in the Resume Maker. Everything else stays free." |
| 2 | Balance card | `Card`: "Your AI balance", the `balanceLabel` text in large type, the line "Free uses are spent before credits.", and a link "Open Resume Maker" to `/resumes/new`. On a failed load: "Your balance could not be loaded right now." (muted, no link change). |
| 3 | Plan cards | Grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`. Free card first (no button). Then one card per `CREDIT_PACKS` entry: name, "N credits", price (large), `pricePerCredit`, and `<BuyButton pack={pack} />`. The popular card gets a `Badge` "Most popular" and an accent border. |
| 4 | What uses a credit | `Card` with two short lists, "Costs 1 use" and "Always free", plus the two rules (failed requests are free; free uses first), per AC-7. |
| 5 | FAQ | `Card` with the three questions and answers of AC-8 as a description list (`dl`, `dt`, `dd`). |

**Components**:

| Piece | Kind | Does |
|---|---|---|
| `app/(dashboard)/pricing/page.tsx` | server | Calls `getAiBalanceForUser()`; renders the five sections; passes nothing user specific to the client except per pack props. |
| `components/pricing/buy-button.tsx` | client | A `Button` "Buy" with `aria-label` "Buy <name>"; local `open` state; renders the existing `Dialog` (`title` "Payments are coming soon", `description` per AC-6) with a Close button. The `Dialog` already traps focus, closes on Escape and backdrop, and gives focus back on close. No server call. |
| `components/ui/sidebar.tsx` | changed | A `{ href: "/pricing", label: "Pricing", icon }` entry appended after Interview, with an inline tag icon in the same style as the other entries; the existing longest match rule handles the active state. |
| `components/resume/editor/target-role-box.tsx` | changed | Uses `balanceLabel` instead of its own wording logic (same output). |

**API surface**: no new endpoint or server action. The page reuses:

| Action | Kind | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `getAiBalanceForUser()` (spec 0004) | server action, called from the server component | none | `AiBalanceView` | signed in (dashboard layout plus `withAction`) | "Unauthorized", database error → the balance card's fallback text |

**Value sourcing**:

| Action / screen | Value produced or displayed | Source |
|---|---|---|
| Sidebar | link target, active state | `"/pricing"`; existing longest match rule in `sidebar.tsx` |
| Spec 0004 links | target | `PRICING_PATH` in `lib/ai/credits-shared.ts` (already `"/pricing"`) |
| Balance card | balance text | `balanceLabel(getAiBalanceForUser().data)` |
| Balance card | fallback text | constant in the page, used when the action returns `success: false` |
| Free card | "5 AI uses" | `AI_FREE_USES` from `lib/ai/credits-shared.ts` |
| Pack cards | name, credits, price, popular badge | `CREDIT_PACKS` entries |
| Pack cards | price text | `formatUsd(pack.priceCents)` |
| Pack cards | per credit text | `pricePerCredit(pack)` |
| Buy dialog | title, text | constants in `buy-button.tsx` per AC-6 |
| What uses a credit, FAQ | copy | static text in the page per AC-7 and AC-8 |
| Page | tab title | `metadata.title = "Pricing"` |

**Key invariants**:
- Buy never sends a request and never changes `AiBalance` or `AiLedger`.
- The page never computes or stores a balance itself; it only displays `getAiBalanceForUser`.
- Every pack price shown comes from `CREDIT_PACKS`; no price is typed anywhere else.
- The balance wording is produced only by `balanceLabel`.

**Security model**: The page is behind the dashboard layout's session check. The only user data shown is the signed in user's own balance, read through the session. No new action exists, so nothing new is reachable from the browser. No payment data is collected; no compliance scope applies.

**Configuration required**: none.

**Critical test scenarios**:
- Happy path: signed in, click "Pricing" in the sidebar → `/pricing`, only Pricing highlighted, sections in the AC-3 order, balance card shows "5 free AI uses left", verifies **AC-1**, **AC-3**, **AC-4**.
- From the limit message: with 0 uses, click "See pricing" in the editor's AI panel, button hint, and balance line → this page each time, verifies **AC-2**.
- Buy: press "Buy Plus" → the dialog with the AC-6 text; Escape closes it and focus is back on "Buy Plus"; no server action request in the network log; `AiBalance` and `AiLedger` unchanged, verifies **AC-6**.
- Content: the pack cards show $4, $10, $20 with $0.20, $0.17, $0.13 per credit and "Most popular" on Plus; the explainer and FAQ match AC-7 and AC-8, verifies **AC-5**, **AC-7**, **AC-8**.
- Failure: make `getAiBalanceForUser` fail (for example by stopping the database connection) → the balance card shows the fallback text and the packs still render, verifies **AC-4**.
- Layout: light and dark mode screenshots; 375px with no sideways scroll and stacked cards; 1280px with four cards in a row, verifies **AC-9**.
- Auth: signed out, open `/pricing` → redirected to `/auth/login`, verifies **AC-1**.

## Build plan

Tracer Bullet: task 1 makes the page reachable end to end (sidebar link, route, real packs, real links from spec 0004); tasks 2 to 4 thicken it with the dialog, the live balance, and the explainer copy; task 5 checks it.

1. Add `lib/pricing/packs.ts` (`CreditPack`, `CREDIT_PACKS`, `formatUsd`, `pricePerCredit`); add `app/(dashboard)/pricing/page.tsx` with the header and the plan cards (Free plus the three packs, with static Buy buttons for now) and `metadata.title`; add the sidebar entry, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**.
2. Add `components/pricing/buy-button.tsx` with the coming soon `Dialog` and wire it into each pack card, satisfies **AC-6**.
3. Add `balanceLabel` to `lib/ai/credits-shared.ts`, switch `target-role-box.tsx` to it, and add the balance card (with its fallback) to the page, satisfies **AC-4**.
4. Add the "What uses a credit" section and the FAQ, satisfies **AC-7**, **AC-8**.
5. Run `npx tsc --noEmit`, `npm run lint`, `npm run build`; render the page in light and dark mode at 375px and 1280px; walk the critical test scenarios, satisfies **AC-1** to **AC-9**.

## Consequences

**Positive**:
- Every "See pricing" link from spec 0004 works.
- No new table, action, or dependency; the page is plain server rendering plus one small client component.
- Payments (deferred) start from a ready pack list and a single place to swap the dialog for a checkout call.
- The editor and the pricing page can never word the balance differently.

**Negative / tradeoffs**:
- Showing prices before payments exist sets an expectation; changing them later means users may have seen the old ones.
- Buy buttons that do nothing yet can frustrate eager users; the dialog says so plainly, but it is still a dead end.
- Prices are a code constant, so changing one needs a deploy.
- Signed out visitors cannot see pricing; a public version would need its own layout later.

**Neutral**:
- A new `components/pricing/` folder and a `lib/pricing/` folder.
- `target-role-box.tsx` changes wording logic only (same output).

## Follow-up

- [ ] When real payments are designed (deferred in the scope), `BuyButton` becomes the checkout entry and grants go through spec 0004's ledger with an idempotency key per payment; `CREDIT_PACKS` is the price list to send.
- [ ] If marketing needs pricing for signed out visitors, design a public `/pricing` layout as a separate decision.
- [ ] `/sync` should note `lib/pricing/packs.ts` as the single source of prices.
