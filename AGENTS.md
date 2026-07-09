<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ATS Resume Checker

Full-stack Next.js app for ATS resume analysis, improvement, and interview preparation.

## Tech Stack

- **Next.js** 16.2.10 (App Router) — `params` and `searchParams` are Promises, `headers()` and `cookies()` are async
- **React** 19.2.4
- **TypeScript** strict
- **Tailwind CSS** v4 — uses `@import "tailwindcss"` in CSS, no `tailwind.config.ts`
- **Better Auth** — server: `better-auth`, client: `better-auth/client`, next integration: `better-auth/next-js`
- **Prisma** 6.19.3 — standard schema with `url = env("DATABASE_URL")`
- **Neon PostgreSQL** — `DATABASE_URL` in `.env`
- **OpenRouter** — free models via REST API at `https://openrouter.ai/api/v1/chat/completions`
- **Zod** — validation
- **React Hook Form** not used yet (plain forms with `FormData`)
- **Mammoth** — DOCX parsing
- **pdf-parse** v3 — PDF parsing, class `PDFParse`, method `getText()` returns `TextResult { pages, text, total }`

## Project Structure

```
actions/              # Server Actions
  auth.ts             # getSession, getCurrentUser, requireAuth
  resume.ts           # uploadResume, getResumes, getResume, deleteResume, updateResumeText
  cover-letter.ts     # uploadCoverLetter, getCoverLetters, getCoverLetter, deleteCoverLetter
  analysis.ts         # analyzeResume, analyzeCoverLetter, matchResumeToJob
  improve.ts          # improveResume, improveCoverLetter
  interview.ts        # generateInterviewQuestions, getInterviews
app/                  # Next.js App Router
  api/auth/[...all]/route.ts   # Better Auth route handler
  auth/login/         # Login page
  auth/register/      # Register page
  (dashboard)/        # Protected routes behind auth check
    layout.tsx        # Sidebar nav, session check, sign-out
    dashboard/        # Upload forms + recent docs
    resumes/          # List + detail with analysis/improvement/interview
    cover-letters/    # List + detail with analysis/improvement
    analyze/          # ATS analysis + job matching (client component)
    interview/        # Interview question generation (client component)
components/
  auth/               # login-form, register-form, sign-out-button
  forms/              # resume-upload-form, cover-letter-upload-form
  resume/             # resume-actions (analyze/improve/interview/delete/job-match)
  cover-letter/       # cover-letter-actions (analyze/improve/delete)
lib/
  ai/client.ts        # OpenRouter client: callAI<T>(systemPrompt, userPrompt, dedupKey?)
  auth/auth.ts        # Better Auth server config (email/password + optional Google)
  auth/client.ts      # createAuthClient for signIn, signUp, signOut, useSession
  auth/url.ts         # Dynamic base URL resolution (supports localhost, Vercel, custom)
  parser/resume-parser.ts  # parseResumeFile(file) -> { text, fileName }
  prisma/db.ts        # PrismaClient singleton
  prompts/            # 5 modules: ats, resume-improve, cover-letter-improve, interview, job-match
prisma/schema.prisma  # User, Account, Session, Verification, Resume, CoverLetter, Analysis, Interview
types/index.ts        # All response types: ATSAnalysisResponse, JobMatchResponse, etc.
```

## Key Conventions

- **Server Actions** are in `actions/`, use `"use server"`, import `revalidatePath` from `"next/cache"`
- **Pages** with forms/interactivity are client components (`"use client"`)
- **Dashboard layout** checks session server-side and redirects to `/auth/login` if unauthenticated
- **AI prompts** always request `response_format: { type: "json_object" }` from OpenRouter
- **Auth** is handled entirely by Better Auth — do NOT add custom session/credential logic
- **File uploads** are handled via FormData + Server Actions (no API routes needed)

## Environment Variables Required

```
DATABASE_URL              # Neon PostgreSQL connection string
BETTER_AUTH_SECRET        # Random string >= 32 chars
BETTER_AUTH_URL           # Optional — auto-detected via VERCEL_URL or http://localhost:3000 fallback
OPENROUTER_API_KEY        # Required — from openrouter.ai/keys
OPENROUTER_MODEL          # Optional — default: gpt-oss-120b:free
OPENROUTER_BASE_URL       # Optional — default: https://openrouter.ai/api/v1
AI_TIMEOUT_MS             # Optional — default: 30000 (30s)
GOOGLE_CLIENT_ID          # Optional, for Google login
GOOGLE_CLIENT_SECRET      # Optional, for Google login
```

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npx prisma db push    # Push schema to database
npx prisma generate   # Generate Prisma client
npx prisma studio     # Open database UI
```

## AI Model

Configured via `OPENROUTER_MODEL` env var (default: `gpt-oss-120b:free`).

Uses `temperature: 0.2`, `max_tokens: 1024`, 30s timeout, and `response_format: { type: "json_object" }`. Retries up to 3 times per model with 1s/2s/4s exponential backoff for 429/5xx errors. In-flight dedup prevents duplicate requests. Response cache (5 min TTL) avoids redundant calls for identical prompts.

### Automatic Fallback Models

If the primary model returns 429, 500, 502, 503, or 504, the request automatically falls through to the next available model:

1. **Primary** — `openai/gpt-oss-120b:free`
2. **Fallback 1** — `google/gemini-2.5-flash:free`
3. **Fallback 2** — `deepseek/deepseek-v3:free`
4. **Fallback 3** — `qwen/qwen3:free`

Non-retryable errors (401, 403, credit exhausted, etc.) halt immediately and do NOT trigger fallback. All provider errors are logged server-side; dev-only logs include model name, duration, retries, and fallback chain.

## Important Notes

- `revalidatePath` comes from `"next/cache"`, NOT from `next/dist/...`
- `pdf-parse` v3 uses `PDFParse` class (not default export), call `getText()` which returns `{ text: string, pages: Array<{ num, text }>, total: number }`
- Better Auth `toNextJsHandler` takes `auth.handler` (the function, not the auth object)
- Prisma 6 uses standard `url` in datasource (Prisma 7+ changed this)
- The `callAI` generic expects the return type — always type the response
- CSS uses `@import "tailwindcss" (Tailwind v4) — no `@tailwind` directives
- The `getServerBaseURL()` / `getClientBaseURL()` in `lib/auth/url.ts` auto-detect the deployment URL:
  - Priority: `BETTER_AUTH_URL` > `VERCEL_URL` > `http://localhost:3000`
  - Client-side uses `window.location.origin` when available (no build-time inlining issues)
