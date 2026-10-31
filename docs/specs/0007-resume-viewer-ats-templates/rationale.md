# 0007. Resume viewer and ATS templates: rationale

## Context

Since spec 0001 a built resume is a structured section document, and since spec 0006 an upload can become one too. But the resume detail page still shows every resume as monospace plain text (`contentText`), the same way it shows a raw upload. Users can't see what their resume actually looks like, and the structured data they edited section by section is shown as if it were a text file.

The look of a resume matters, but for this product the hard constraint is ATS safety: applicant tracking systems parse resumes best when they are one column, use real text, keep headings conventional, and avoid tables, text boxes, and images. Any template the app offers has to stay inside those rules, or the app that checks ATS scores would be producing resumes that score badly.

Three more forces shape the design. Feature 7 (PDF export) is next and must print exactly what the user sees, so whatever renders the resume here should be reusable there. Changing the look must not count as a content edit: analyses and interview questions are marked "Out of date" by comparing `contentUpdatedAt` (spec 0002), and the editor's save uses `contentUpdatedAt` as its version check, so a look change that touched it would make results stale and break open editors. Finally, the theme is Amber Walnut with a dark mode, but a resume preview is a picture of a printed document and should not turn dark.

Without a decision, the scope's "Done when" for feature 8 can't be met, and PDF export would have to invent its own renderer.

## Options considered

### Option 1: One template component with per template style maps

A single `ResumeTemplate` component renders the structure, and each template is a configuration object (font, alignment, heading style, separators) the component reads.

**Pros**:
- One place for the section logic; templates can't drift in structure.
- A new template is a config entry.

**Cons**:
- The three Figma frames differ in layout, not just style (Compact puts name and contact on one line, Modern joins the title line, Classic splits it over two lines). The config grows flags for every layout difference and the component becomes a tangle of conditionals.
- Harder to compare one template against its Figma frame when its look is spread across a generic component and a config.

### Option 2: Three template components sharing building blocks, a code registry, and per resume text columns

Each template is its own small React component, built against its Figma frame, using shared parts (placeholder highlighting, links, bullets, dates). A registry lists the templates and link styles; the choice is stored per resume in two text columns validated by the registry.

**Pros**:
- Each component maps one to one to a Figma frame, so building and checking are direct.
- Shared parts keep formatting rules (dates, links, placeholders) identical across templates.
- Pure components with no hooks work on the server, on the client, and later in PDF export.
- New templates need no migration.

**Cons**:
- Section order and hiding rules are repeated in three components; a fourth template repeats them again.
- The database doesn't enforce valid values.

### Option 3: Server rendered HTML templates (string templates or a template engine)

Render each template to an HTML string on the server and inject it into the page.

**Pros**:
- The same HTML string could feed a headless browser for PDF later.

**Cons**:
- Raw HTML injection reopens the XSS surface the app avoids everywhere else (all resume text is rendered as React text today).
- The optimistic switch (instant change on click) would need a server round trip per change.
- A second rendering technology next to React for no gain.

### Option 4: AI generated or user customized templates

Let AI build a template from a description, or let users tweak fonts, colors, and spacing.

**Pros**:
- Far more variety.

**Cons**:
- Generated layouts can't be guaranteed ATS safe, which undercuts the product.
- Costs AI uses and needs storage and validation for arbitrary layouts.
- The engineer chose a fixed set.

## Rationale

The engineer settled the product shape: a fixed set of three code templates, shown on the detail page, saved per resume, with the look coming from Figma frames. Within that, Option 2 wins because the templates really differ in layout, which is where Option 1's single component gets fragile, and because pure React components are the one rendering path that serves the instant on screen switch, safe text rendering, and reuse by PDF export together. Repeating the section order in three small files is a cheap, visible cost; the shared parts carry the rules that must never differ (dates, links, placeholders).

Storing the choice as text columns with defaults, checked by a code registry, keeps adding a template migration free and lets a removed template fall back gracefully instead of failing a database read. Per resume storage was the engineer's pick and matches the use case of keeping differently styled resumes side by side. Writing only these columns, never `contentUpdatedAt`, is what keeps analyses current and the editor's version check intact.

Fonts come from `next/font` so each template looks the same on every device and PDF export can embed the same files; self hosting avoids a runtime call to a font service. Sheet colors are theme tokens that are deliberately left out of the dark variant, which respects the project's "theme tokens only" rule while keeping the paper white.

**Update (same day): A4 pages.** The engineer replaced the "one continuous sheet" choice with real A4 pages: one page when it fits, page 2 when it doesn't, and a warning (not a cut) past 2 pages. Pages are measured in the browser and filled block by block, because only the browser knows the real rendered height of text in a given font; CSS print pagination and multi column layouts can't show separate sheets on screen or keep a heading with its first bullet reliably. Hiding text past page 2 was rejected because users may not notice it is gone, and shrinking type to fit was rejected because it hurts readability and ATS parsing. On phones the pages scale down instead of reflowing, so the breaks a user sees always match the real pages (runner up: reflow on phones, which would show breaks that don't exist on paper). A4 was chosen as the single size, so the Letter question no longer waits for PDF export.

Smaller calls made here: the link style picker is a radio group rather than a menu, because the engineer wanted the pros and cons visible, and a radio group shows all three tradeoffs at once (runner up: a select with the chosen option's tradeoff below it). `setResumeAppearance` has no cooldown, since it makes no AI call and writes one row (runner up: the default 10 s cooldown, which would block quick switching). Unreadable content falls back to the text view instead of failing the page, matching how spec 0002 treats damaged sections as a readable state rather than a crash.
