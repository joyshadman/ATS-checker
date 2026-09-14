# Code Standards

## General

- Keep modules small and single-purpose
- Fix root causes, do not layer workarounds
- Do not mix unrelated concerns in one component or route

## TypeScript

- Strict mode is required throughout the project
- Avoid `any` — use explicit interfaces or narrowly scoped types
- Validate unknown external input at system boundaries before trusting it
- All server action return types use `ActionResult<T>` from `types/index.ts`

## Next.js

- Default to server components for data-fetching pages
- Add `"use client"` only when browser interactivity is required
- Keep route handlers focused on a single responsibility
- `params` and `searchParams` are Promises in Next.js 16 (must await)
- `headers()` and `cookies()` are async functions

## Styling

- Use CSS custom property tokens from `globals.css` — prefer token-based classes over hardcoded hex values where possible
- Use Tailwind v4 utility classes — no `tailwind.config.ts` file exists
- CSS uses `@import "tailwindcss"` syntax (not `@tailwind` directives)
- Some components still have hardcoded zinc/emerald/rose colors that should eventually be migrated to tokens

## Server Actions

- All mutations go through `withAction()` in `lib/action-helpers.ts`
- `withAction()` handles auth, error wrapping, and cooldown
- Import `revalidatePath` from `"next/cache"` (not from `next/dist/...`)
- Always validate input with Zod at the boundary

## API Routes

- Only one API route exists: `/api/auth/[...all]` for Better Auth
- Do not add custom API routes — use Server Actions instead

## Data and Storage

- All metadata lives in the PostgreSQL database
- No blob/file storage — extracted text stored directly in the database
- Resume files are parsed immediately and the original is not retained

## File Organization

- `actions/` — Server-only mutations and queries (all use `"use server"`)
- `components/ui/` — Generic, reusable UI primitives
- `components/forms/` — Upload forms
- `components/resume/` — Resume-specific components
- `components/cover-letter/` — Cover letter-specific components
- `components/auth/` — Auth-related components
- `lib/` — Core libraries (AI, auth, parsing, prompts, Prisma, utils)
- `hooks/` — Client-side React hooks
- `types/` — Shared TypeScript types
- `app/` — Next.js routes, pages, layouts, API handlers
