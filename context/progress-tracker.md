# Progress Tracker

## Current Phase

UI Theme Redesign — Amber Walnut Morning

## Current Goal

Transform the visual design from indigo/zinc (current) to an Amber Walnut Morning theme while preserving all functionality.

## Completed

- Full ATS Resume Checker application built and functional
- Authentication (Better Auth with Google OAuth)
- Resume upload, parsing (PDF/DOCX/TXT), and storage
- Cover letter upload and storage
- ATS analysis via OpenRouter AI
- Resume improvement via AI
- Cover letter analysis and improvement via AI
- Interview question generation via AI
- Job matching via AI
- Dashboard with stats, upload forms, recent activity
- Resume list with search, sort, and delete
- Resume detail with scores, sections, suggestions, improvements
- Cover letter list and detail pages
- Dedicated analyze page with resume selector and job matching
- Dedicated interview page with question generation
- Loading states, error boundaries, empty states
- Toast notification system
- Light/dark theme toggle
- Responsive mobile sidebar

## In Progress

- None — theme work complete.

## Completed (Theme Phase)

- `app/globals.css` rewritten: amber/walnut light tokens, walnut-night dark tokens, warm gradient utilities, walnut-tinted shadows, warm shimmer.
- `app/layout.tsx` viewport themeColor updated to warm values.
- All `components/ui/*`, `components/forms/*`, `components/resume/*`, `components/cover-letter/*`, `components/auth/*` restyled onto theme tokens (no hardcoded zinc/indigo/emerald/rose/amber-* left).
- All `app/(dashboard)/*` pages, `app/auth/login`, `app/not-found`, `app/(dashboard)/error` restyled.
- `npm run lint` clean; `npm run build` passes.
- Documentation written: `context/ui-theme.md`.

## Next Up

- None (project complete for this scope).

## Open Questions

- None

## Architecture Decisions

- **AI model routing:** Uses OpenRouter with automatic fallback model chain for resilience
- **File parsing:** Custom pdfjs-dist integration with DOMMatrix polyfill for Next.js SSR compatibility (pdf-parse v3 was problematic)
- **Auth:** Better Auth chosen for simplicity with Prisma adapter and Google OAuth support
- **Actions over API routes:** Server Actions used for all mutations to leverage Next.js server-side auth and revalidation
