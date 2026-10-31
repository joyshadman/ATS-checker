# 0005. Pricing page: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md`; this file explains why.

## Context

Spec 0004 shipped AI usage limits: 5 free AI writing uses per account, then credits. When users run out, the editor sends them to `/pricing` through three "See pricing" links, and that route does not exist yet. The scope wants a pricing page in the Amber Walnut style that lists credit packs, reachable from the sidebar and from the limit message, where Buy does not charge anything yet and only says payments are coming soon.

Forces at play:

- **Payments are deferred.** There is no provider, no checkout, and no webhook, so anything the page does on Buy must be honest that nothing happened.
- **The balance already exists.** Spec 0004 has `getAiBalanceForUser` and a precise wording for the editor's balance line; a second, slightly different wording would confuse users.
- **The theme is set.** Amber Walnut tokens in `app/globals.css`, documented in `context/ui-theme.md`, plus shared primitives (`PageHeader`, `Card`, `Badge`, `Button`, `Dialog`) used by every dashboard page. The engineer chose to build to that, not a new design.
- **Prices will change.** These are placeholders shown to users; later, the payment flow needs the same list.
- **Conventions**: App Router server components for pages, client components only for interactivity, Alpha rigor, small team.

Engineer decisions taken as fixed requirements: the design follows the existing theme and UI; the page is signed in only, in the dashboard; three packs (Starter 20 for $4, Plus 60 for $10 marked most popular, Pro 150 for $20) in USD; sections are header, balance card, plans with the free tier, what uses a credit, and an FAQ; Buy opens a dialog; Buy clicks are not recorded; the sidebar entry is last in the main list; credits never expire; packs live in a code constant; cards show the price per credit.

## Options considered

### Option 1: Server rendered dashboard page, packs in a code constant, one client Buy component

`/pricing` is a server component in `app/(dashboard)/`. It reads the balance with the existing action and renders the packs from `lib/pricing/packs.ts`. Only the Buy button is a client component, owning the dialog state.

**Pros**:
- No new table, action, or dependency.
- Minimal JavaScript sent to the browser: only the Buy buttons hydrate.
- The pack list is typed, reviewed in code, and ready for payments to reuse.

**Cons**:
- Changing a price needs a deploy.
- Signed out visitors cannot see pricing.

### Option 2: Packs in a database table

A `CreditPack` table edited in Prisma Studio, read by the page.

**Pros**:
- Prices change without a deploy.

**Cons**:
- A migration and a query for three static rows.
- Prices could change without review, and a bad edit goes live instantly.
- Payments would then need to trust a mutable price at checkout time, which is a harder design.

### Option 3: Fully client rendered page

A client component page that fetches the balance after load.

**Pros**:
- Everything in one component.

**Cons**:
- A loading flash for the balance, more JavaScript, and a second fetch path for data the server already has.
- Goes against the project's pattern of server pages with small client islands.

### Option 4: Public marketing page

`/pricing` outside the dashboard, visible to everyone.

**Pros**:
- Visitors can see prices before signing up.

**Cons**:
- Needs its own layout without the sidebar, and cannot show a balance to signed out visitors.
- The engineer chose signed in only; every link to the page today comes from signed in screens.

## Rationale

Option 1 matches what this page actually is right now: a static offer plus one number the server already knows. Rendering it on the server with the existing `getAiBalanceForUser` keeps the data path single and avoids a loading flash, and keeping the Buy dialog as the only client island follows how the rest of the dashboard is built. Option 3 adds JavaScript and a second fetch for no gain.

Putting the packs in a typed constant rather than a table (Option 2) is the safer choice for prices that will soon be charged: a price change goes through code review and a deploy, and the later checkout can trust the same list on the server instead of a value anyone with database access could edit. Three rows do not justify a migration.

Sharing `balanceLabel` between the editor and this page is a small refactor with a real payoff: spec 0004 defined the wording carefully, and a second copy would drift. A public page (Option 4) may be right once there is marketing traffic, but it is a separate layout decision, recorded as a follow up rather than built now.
