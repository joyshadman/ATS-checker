# Verify: Pricing page · spec 0005 · updated 2026-10-31
_Steps derived from spec 0005 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones. You need one signed in account, the dev server (`npm run dev`), and Prisma Studio or a query tool to read and set `AiBalance`._

## UI / manual

### Reach the page
- [ ] Click "Pricing" in the sidebar (last item, after Interview) → `/pricing`; only "Pricing" is highlighted; the tab title is "Pricing | ATS Checker" → AC-1, AC-3
- [ ] Signed out, open `/pricing` → redirected to `/auth/login` → AC-1
- [ ] With 0 uses left, click "See pricing" in the editor's balance line, in an AI button's hint, and in an AI panel's limit message → `/pricing` each time, never the not found page → AC-2

### Content
- [ ] Headings in order: h1 "Pricing", h2 "Plans", h2 "What uses a credit", h2 "Questions"; the balance card sits between the header and Plans → AC-3
- [ ] Balance card reads "5 free AI uses left" for a new user, "12 credits" with free uses spent and 12 credits, "1 credit" for 1, "No AI uses left" at 0; "Open Resume Maker" goes to `/resumes/new` → AC-4
- [ ] Plan cards: Free "$0", "5 AI uses, once per account", no Buy button; Starter 20 credits $4 "$0.20 per credit"; Plus 60 credits $10 "$0.17 per credit" with "Most popular"; Pro 150 credits $20 "$0.13 per credit" → AC-5
- [ ] Buy buttons are announced as "Buy Starter", "Buy Plus", "Buy Pro" → AC-5
- [ ] "What uses a credit" lists AI writing (summary, bullets, skills), import, and "every request counts" under "Costs 1 use"; ATS analysis and job match, interview questions, Improve Resume, and cover letters under "Always free"; plus the line about failed requests and free uses first → AC-7
- [ ] The FAQ shows the three questions and answers exactly as AC-8 states → AC-8

### Buy dialog
- [ ] Press "Buy Plus" with the keyboard → a full screen dialog "Payments are coming soon" with the AC-6 text; focus is inside it → AC-6
- [ ] Escape closes it and focus is back on "Buy Plus"; the Close text button does the same for "Buy Pro"; a click on the dimmed backdrop does the same for "Buy Starter" → AC-6
- [ ] No server action request in the network log while doing the above; `AiBalance` and `AiLedger` unchanged → AC-6

### Layout and theme
- [ ] 1280px: the four plan cards in one row; light and dark mode both readable → AC-9
- [ ] About 900px: two cards per row → AC-9
- [ ] 375px: one card per row, no sideways scrolling, light and dark → AC-9

### Shared Dialog change (regression)
- [ ] In the editor, "Remove section" on Projects with an entry → the confirm dialog covers the whole screen, a backdrop click closes it, and "Remove section" in it still works
- [ ] In the editor with an AI draft waiting, Save → "Discard the AI improvement?" covers the whole screen; Cancel and "Save and discard draft" still work

## Value sourcing checks
- [ ] Change a price in `CREDIT_PACKS` (for example Plus to 1200 cents), reload → the card shows "$12" and "$0.20 per credit"; revert it → AC-5
- [ ] `formatUsd` drops decimals only for whole dollars: 400 → "$4", 17 → "$0.17" → AC-5
- [ ] The Free card's "5" comes from `AI_FREE_USES` → AC-5
- [ ] Balance wording matches the editor's line for the same balance (both use `balanceLabel`) → AC-4
- [ ] Make `getAiBalanceForUser` fail (for example point `DATABASE_URL` at a dead host for one run) → the balance card says "Your balance could not be loaded right now." and the plans, explainer, and FAQ still render → AC-4

## Commands
- [ ] `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` → clean; `/pricing` listed as a dynamic route (the Better Auth `headers()` notes are old) → all
- [ ] Search the new files for raw colors (`zinc`, `indigo`, `white`, `black`, hex values) → none → AC-9

## Acceptance-criteria coverage
- AC-1 Reach 1, 2 · AC-2 Reach 3 · AC-3 Reach 1, Content 1 · AC-4 Content 2, Value sourcing 4, 5 · AC-5 Content 3, 4, Value sourcing 1 to 3 · AC-6 Buy dialog 1 to 3 · AC-7 Content 5 · AC-8 Content 6 · AC-9 Layout 1 to 3, Commands 2
