# Amber Walnut Morning — UI Theme

Design-system implementation of the "Amber Walnut Morning" theme for the ATS Checker UI. This document describes the FINAL implemented state (post Phase 2).

## Palette

| Token            | Light              | Dark (Walnut Night) | Usage                                                                 |
| ---------------- | ------------------ | ------------------- | --------------------------------------------------------------------- |
| `--background`   | `#F7F1E7`          | `#1C1410`           | Page background                                                       |
| `--foreground`   | `#34251D`          | `#F2E9DA`           | Primary text                                                          |
| `--border`       | `#DCCDB8`          | `#3B2C21`           | Outlines, dividers                                                     |
| `--muted`        | `#766456`          | `#B3A18E`           | Secondary text, placeholders                                           |
| `--card`         | `#FFF9EF`          | `#282019`           | Card surface                                                          |
| `--card-hover`   | `#F7EFE0`          | `#2F261D`           | Hover surface                                                         |
| `--surface`      | `#EFE3D0`          | `#231B14`           | Inputs, code blocks, progress track, raised panels                     |
| `--surface-secondary` | `#E8D8C0`    | `#33281F`           | Nested panels, step rings                                             |
| `--accent`       | `#B7791F`          | `#D49A3A`           | Primary interactive/focus accent (amber)                               |
| `--accent-fg`    | `#FFF9EF`          | `#2E211A`           | Text on accent surfaces                                                 |
| `--walnut`       | `#2E211A`          | `#2E211A`           | Deep neutral for warm dark elements                                    |
| `--cream`        | `#FFF9EF`          | `#F2E9DA`           | Warm light text on dark/walnut gradients                               |
| `--success`      | `#667A45`          | `#93A86C`           | Olive green — passing scores, strengths, key strengths checkmarks      |
| `--warning`      | `#B7791F`          | `#D3A144`           | Amber — fair scores, warnings                                           |
| `--danger`       | `#A64B3C`          | `#CE7A63`           | Terracotta — failing scores, errors, weaknesses, destructive actions   |

## Theming Architecture

- Tailwind CSS v4: tokens are exposed via `@theme inline` in `app/globals.css`, mapping utility names like `bg-surface`, `text-accent`, `border-border`, `text-danger` to the CSS custom properties above.
- The dark theme is a class-based variant (`@custom-variant dark (&:where(.dark, .dark *))`) — the existing `ThemeToggle` in `components/ui/theme-toggle.tsx` toggles `.dark` on `<html>` and persists to `localStorage["theme"]`. Dark mode was **restyled, not removed**.
- Two font stacks kept: `--font-sans` (Geist Sans) and `--font-mono` (Geist Mono), wired through `app/layout.tsx`.
- No `tailwind.config.ts` — all custom colors/shadows/animation utilities are defined in `globals.css` only.

## Gradient Utilities (fixed hardcoded colors)

Defined in `@layer utilities` in `globals.css`. Greys/indigo/zinc are gone; every gradient is now a warm walnut/amber stop. White/cream text remains readable on all of them.

| Utility              | Value                                                            |
| -------------------- | ---------------------------------------------------------------- |
| `bg-gradient-primary`| `135deg, #4A2F20 → #6E4B33` (deep walnut)                        |
| `bg-gradient-accent` | `135deg, #8F6215 → #B7791F` (deep amber)                          |
| `bg-gradient-success`| `135deg, #667A45 → #7C9251` (olive)                               |
| `bg-gradient-warning`| `135deg, #8F6215 → #B97E22` (gold)                                |
| `bg-gradient-error`  | `135deg, #A64B3C → #C0604E` (terracotta)                          |
| `bg-gradient-card`   | `135deg, #B7791F08 → #D49A3A08` (translucent amber tint)          |
| `bg-gradient-hero`   | `135deg, #2E211A → #4A2F20 → #6E4B33` (login hero, walnut)        |
| `bg-gradient-mesh`   | radial amber/walnut mesh used on `not-found`                       |
| `bg-gradient-glow`   | warm radial glow                                                    |

Text gradients: `.text-gradient` is amber (`#B7791F → #D49A3A`); `.text-gradient-accent` is walnut (`#4A2F20 → #8A5B28`).

## Shadow Utilities

- `shadow-card`, `shadow-card-hover` — walnut-tinted card elevation (`rgb(74 47 32 / …)`)
- `shadow-float` — large soft lift
- `shadow-glow`, `shadow-glow-lg` — amber glow (`rgb(183 121 31 / …)`)
- `shadow-inner-soft` — subtle inset for inputs

## Animation Utilities

`animate-fade-in`, `animate-slide-up`, `animate-slide-down`, `animate-scale-in`, `animate-shimmer`, `animate-pulse-subtle`, `animate-progress`, `animate-float`, `animate-spin-slow` — all existing names preserved; shimmer uses `--surface` tokens instead of zinc. Stagger delays `.stagger-1 … .stagger-6` unchanged.

## Component Mapping (what changed)

Components moved off hardcoded Tailwind defaults (zinc/indigo/emerald/rose/amber-*) onto theme tokens/gradients:

- **button** — `default` variant: card surface; `destructive`: `bg-gradient-error`; `primary`: `bg-gradient-primary` + `text-cream`, handler focus ring accent.
- **badge** — all variants now token-based: default `bg-warning/10 text-warning`, success/olive, danger/terracotta, accent, primary.
- **input / select / textarea** — warm border (`border-border`), `bg-surface`/white track, accent focus ring, danger border/error text.
- **sidebar** — active item: `bg-gradient-primary text-cream`; hover on logout uses warm `text-danger`. Mobile sidebar classes kept.
- **score-circle** — `stroke-success/warning/danger`; **score-badge** — token variants; stats cards use the four gradients.
- **progress** — unchanged code; `bg-gradient-success/primary/warning/error` still map to olive/walnut/gold/terracotta.
- **dialog** — overlay kept as neutral `bg-black/40` (unchanged).
- **skeleton** — unchanged, built on `bg-surface`/`bg-card`.
- **theme-toggle** — unchanged, built on card tokens.
- **file upload forms** (resume + cover letter) — drop-zone focus/border/accent icon now amber (`border-accent`, `bg-accent/5`, icon `text-accent`); drag state uses `scale-[1.01]` + amber.
- **resume-selector, job-description-input** — highlighted selection/data rows now amber.
- **empty-state, page-header, card-title** — surface/accent tokens; `card-title` defaults to `bg-accent`.
- **resume-list** — icons `text-accent`; delete hover `text-danger` + danger tint.
- **toast / error-banner** — variant boxes now `border-success|danger/25 bg-success|danger/10 text-success|danger`.
- **analyze / interview / resume detail / cover-letter pages** — headings + check/X icons use `text-success`/`text-danger`; gradient number circles use `text-cream` on walnut.
- **dashboard** — stat icons switched from indigo to amber `text-accent`; stat tiles keep gradient classes (now walnut/amber/olive/gold/terracotta).
- **login page** — hero stays walnut gradient; error banners use `danger` tokens; the "Google OAuth not configured" notice uses `warning` tokens.
- **error.tsx / not-found.tsx** — icons `text-danger`; CTA button `bg-gradient-primary text-cream`.

## Rules for Future UI Work

- Prefer theme tokens (`bg-surface`, `text-accent`, `border-border`, `text-danger`, …) over raw color utilities.
- New solid accent: use `--accent`/`--accent-fg` or gradients. Text on `bg-gradient-primary`/walnut → `text-cream`. Text on amber `bg-gradient-accent` → `text-white` or `text-walnut` (both legible).
- Keep dark mode: always provide both `:root` and `.dark` token values; test with ThemeToggle.
- If a component never existed on a Tailwind color, you may not need to change it.
- Do not add new color enums to class strings; add tokens to `globals.css` only when a new semantic is truly needed.

## Verification

- `npm run lint` — clean.
- `npm run build` — compiles, TypeScript passes. (The `[auth] getSession … Dynamic server usage` lines during static generation are pre-existing Better Auth `headers()` behavior, not build failures.)