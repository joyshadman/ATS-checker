<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ATS Resume Checker

Full-stack Next.js app for ATS resume analysis, improvement, and interview preparation.

## Build approach

Tracer Bullet (each feature runs end to end through page, server action, and database before the next one starts).

## Tech Stack

- **Next.js** 16.2.10 (App Router) — `params` and `searchParams` are Promises, `headers()` and `cookies()` are async
- **React** 19.2.4
- **TypeScript** strict
- **Tailwind CSS** v4 — uses `@import "tailwindcss"` in CSS, no `tailwind.config.ts`
- **Better Auth** — server: `better-auth`, client: `better-auth/client`, next integration: `better-auth/next-js`
- **Prisma** 6.19.3 — standard schema with `url = env("DATABASE_URL")`
- **Neon PostgreSQL** — `DATABASE_URL` in `.env`
- **OpenRouter** — model access via REST at `https://openrouter.ai/api/v1/chat/completions`
- **Zod** — validation (the resume document schema and every action input)
- **React Hook Form** 7.80 — the resume section editor only; the upload forms still use plain `FormData`
- **Mammoth** — DOCX parsing
- **pdfjs-dist** — PDF text extraction, imported directly. `pdf-parse` is installed only to supply it and is never called.

## Project Structure

```
actions/              # Server Actions
  auth.ts             # getSession, getCurrentUser, requireAuth
  resume.ts           # uploadResume, getResumes, getResume, deleteResume, updateResumeText
  cover-letter.ts     # uploadCoverLetter, getCoverLetters, getCoverLetter, deleteCoverLetter
  analysis.ts         # analyzeResume, analyzeCoverLetter, matchResumeToJob
  improve.ts          # improveResume, improveCoverLetter
  interview.ts        # generateInterviewQuestions, getInterviews
  credits.ts          # getAiBalanceForUser
  resume-import.ts    # importResume, dismissImportNotice (spec 0006)
  section-writing.ts  # writeResumeSection (spec 0003)
app/                  # Next.js App Router
  api/auth/[...all]/route.ts   # Better Auth route handler
  api/ai-test/route.ts         # AI smoke test route (unauthenticated)
  auth/login/         # Sign in page, Google only (there is no register page)
  (dashboard)/        # Protected routes behind auth check
    layout.tsx        # Sidebar nav, session check, sign-out
    dashboard/        # Upload forms + recent docs
    resumes/          # List, detail, new, and [id]/edit (section editor)
    cover-letters/    # List + detail with analysis/improvement
    analyze/          # ATS analysis + job matching (client component)
    interview/        # Interview question generation (client component)
    pricing/          # Credit packs (spec 0005)
components/
  auth/               # google-sign-in, sign-out-button
  forms/              # resume-upload-form, cover-letter-upload-form
  resume/             # resume-actions, resume-list, editor/, viewer/
  cover-letter/       # cover-letter-actions (analyze/improve/delete)
  ui/                 # Shared UI primitives (button, card, dialog, toast, sidebar, ...)
hooks/                # use-async-action, use-unsaved-changes, use-media-query
lib/
  action-helpers.ts   # withAction wrapper, ActionResult, ownership loaders
  upload-limits.ts    # shared 4 MB upload cap (Next and Vercel body limits)
  ai/client.ts        # OpenRouter client: callAI<T>(systemPrompt, userPrompt, dedupKey?)
  ai/models.ts        # getAIModel(), reads OPENROUTER_MODEL
  ai/prompts.ts       # compressText() prompt trimming
  ai/credits.ts       # reserveAiUse, refundAiUse, getAiBalance (spec 0004)
  ai/credits-shared.ts # free use count and balance wording, safe in the browser
  auth/auth.ts        # Better Auth server config (Google only)
  auth/client.ts      # createAuthClient for signIn, signOut, useSession
  auth/url.ts         # Dynamic base URL resolution (supports localhost, Vercel, custom)
  parser/resume-parser.ts  # parseResumeFile(file) -> { text, fileName }
  prisma/db.ts        # PrismaClient singleton
  prompts/            # 7 modules: ats, resume-improve, cover-letter-improve, interview, job-match, section-writing, resume-import
  resume/             # structured document: schema, form mapping, render, paginate, templates
  pricing/packs.ts    # credit packs shown on /pricing
prisma/schema.prisma  # User, Account, Session, Verification, Resume, CoverLetter, Analysis, Interview, AiBalance, AiLedger
types/index.ts        # All response types: ATSAnalysisResponse, JobMatchResponse, etc.
```

## Key Conventions

- **Server Actions** are in `actions/`, use `"use server"`, import `revalidatePath` from `"next/cache"`
- **Pages** with forms/interactivity are client components (`"use client"`)
- **Dashboard layout** checks session server-side and redirects to `/auth/login` if unauthenticated
- **AI prompts** always request `response_format: { type: "json_object" }` from OpenRouter
- **Auth** is handled entirely by Better Auth — do NOT add custom session/credential logic
- **File uploads** are handled via FormData + Server Actions (no API routes needed)
- **Server actions wrap their body in `withAction()`** from `lib/action-helpers.ts` (auth check, cooldown, error to `{ success: false }`). Load records with `loadResumeWithAuth` / `loadCoverLetterWithAuth` so ownership is always checked.
- **AI usage costs a use:** AI actions reserve with `reserveAiUse` and refund with `refundAiUse` when the call fails (`lib/ai/credits.ts`, 5 free uses, spec 0004).
- **Tests:** no test runner is set up yet.

## Environment Variables Required

```
DATABASE_URL              # Neon PostgreSQL connection string
BETTER_AUTH_SECRET        # Random string >= 32 chars
BETTER_AUTH_URL           # Optional — auto-detected via VERCEL_URL or http://localhost:3000 fallback
OPENROUTER_API_KEY        # Required — from openrouter.ai/keys
OPENROUTER_MODEL          # Required — no default; getAIModel() throws when unset
OPENROUTER_BASE_URL       # Optional — default: https://openrouter.ai/api/v1
AI_TIMEOUT_MS             # Optional — default: 30000 (30s)
GOOGLE_CLIENT_ID          # Required for sign in — Google is the only provider
GOOGLE_CLIENT_SECRET      # Required for sign in
```

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm run credits:grant # Grant AI credits to a user (scripts/grant-credits.mjs)
npx prisma db push    # Push schema to database
npx prisma generate   # Generate Prisma client
npx prisma studio     # Open database UI
```

## Specs

Stored in `docs/specs/` as `NNNN-title/` folders holding `index.md`, `rationale.md`, and `verify.md`. Nine specs exist, 0001 to 0009. The feature list and status live in `docs/scope/scope.md`.

## AI Model

`OPENROUTER_MODEL` is required, for example `openai/gpt-oss-120b`. There is no default model and no automatic fallback: a failure on the configured model is returned to the caller. Check free ids against `https://openrouter.ai/api/v1/models`, since free variants come and go.

Uses `temperature: 0.1`, `max_tokens: 2048` (overridable per call), 30s timeout, and `response_format: { type: "json_object" }`. Up to 2 extra attempts with about 1s then 2s backoff, only for 500, 502, 503 and empty answers. In-flight dedup prevents duplicate requests, and a 5 minute response cache avoids repeat calls for identical prompts. The full client contract is in `lib/ai/AGENTS.md`.

## Important Notes

- `revalidatePath` comes from `"next/cache"`, NOT from `next/dist/...`
- `pdfjs-dist` (legacy build) does the PDF text extraction, page by page. `pdf-parse` is installed only because `pdfjs-dist` arrives through it, and it is never called. See `lib/parser/AGENTS.md`.
- Better Auth `toNextJsHandler` takes `auth.handler` (the function, not the auth object)
- Prisma 6 uses standard `url` in datasource (Prisma 7+ changed this)
- The `callAI` generic expects the return type — always type the response
- CSS uses `@import "tailwindcss" (Tailwind v4) — no `@tailwind` directives
- **Theming:** Amber Walnut Morning — all color tokens live as CSS custom properties in `app/globals.css` and are exposed via `@theme inline` (e.g. `bg-surface`, `text-accent`, `text-danger`, `border-border`). Dark mode is a `.dark` class variant (walnut night) toggled by `ThemeToggle`. Never hardcode raw Tailwind colors (zinc/indigo/emerald/rose) — always use theme tokens. Full reference: `context/ui-theme.md`.
- The `getServerBaseURL()` / `getClientBaseURL()` in `lib/auth/url.ts` auto-detect the deployment URL:
  - Priority: `BETTER_AUTH_URL` > `VERCEL_URL` > `http://localhost:3000`
  - Client-side uses `window.location.origin` when available (no build-time inlining issues)

## Context files

- [lib/ai/AGENTS.md](lib/ai/AGENTS.md) (OpenRouter client: required env, caching, retries, error codes)
- [lib/parser/AGENTS.md](lib/parser/AGENTS.md) (PDF/DOCX/TXT parsing and the pdfjs bundling workarounds)
- [lib/auth/AGENTS.md](lib/auth/AGENTS.md) (Better Auth config, base URL rules, Google only sign in)
- [lib/resume/AGENTS.md](lib/resume/AGENTS.md) (resume document schema, form mapping, rendering, pagination, templates)
- [components/resume/editor/AGENTS.md](components/resume/editor/AGENTS.md) (section editor form, save version check, AI writing)
- [components/resume/viewer/AGENTS.md](components/resume/viewer/AGENTS.md) (A4 sheet, print pagination, PDF export, print title)
