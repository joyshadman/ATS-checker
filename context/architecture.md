# Architecture Context

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                        │
│                                                   │
│  React 19 + Next.js 16 App Router                │
│  Tailwind CSS v4                                  │
│  Client Components (analyze, interview, forms)    │
│  Server Components (dashboard, lists, detail)     │
│                                                   │
├─────────────────────────────────────────────────┤
│                   Server Actions                  │
│                                                   │
│  actions/auth.ts      — Session, user, auth       │
│  actions/resume.ts    — Upload, CRUD, update      │
│  actions/cover-letter.ts — Upload, CRUD           │
│  actions/analysis.ts  — ATS analysis, job match   │
│  actions/improve.ts   — Resume/cover improvement  │
│  actions/interview.ts — Question generation       │
│                                                   │
│  Shared: lib/action-helpers.ts (withAction, etc.) │
│                                                   │
├─────────────────────────────────────────────────┤
│                   AI Layer                        │
│                                                   │
│  lib/ai/client.ts     — callAI<T>()              │
│  lib/ai/models.ts     — Model config              │
│  lib/ai/prompts.ts    — Text compression          │
│  lib/prompts/         — 5 prompt modules          │
│                                                   │
│  OpenRouter REST API                               │
│  json_object response format                      │
│  Exponential backoff, dedup, response cache       │
│                                                   │
├─────────────────────────────────────────────────┤
│                   Database                        │
│                                                   │
│  Prisma 6.19.3 ORM                                │
│  Neon PostgreSQL                                  │
│                                                   │
│  Models: User, Account, Session, Verification,    │
│          Resume, CoverLetter, Analysis, Interview  │
│                                                   │
└─────────────────────────────────────────────────┘
```

## Data Flow: Resume Analysis

```
1. User uploads file (PDF/DOCX/TXT)
   ↓
2. FormData → uploadResume() Server Action
   ↓
3. parseResumeFile() extracts raw text
   ↓
4. Prisma creates Resume record (userId, title, originalText)
   ↓
5. User clicks "Run ATS Analysis"
   ↓
6. analyzeResume() → loadResumeWithAuth() → callAI()
   ↓
7. OpenRouter API → JSON response (scores, strengths, etc.)
   ↓
8. Prisma creates Analysis record + updates Resume.atsScore
   ↓
9. revalidatePath() triggers server re-render
   ↓
10. UI shows ScoreCircle, SectionCards, keywords, recommendations
```

## System Boundaries

| Folder          | Responsibility                                            |
|-----------------|-----------------------------------------------------------|
| `actions/`      | Server-only mutations and queries; all DB + AI calls      |
| `components/`   | Reusable UI components (forms, auth, resume, cover-letter)|
| `components/ui/`| Generic, reusable UI primitives (button, card, input...)  |
| `app/`          | Route definitions, page components, layouts, API routes   |
| `lib/`          | Core libraries (AI, auth, parsing, prompts, Prisma, utils)|
| `types/`        | Shared TypeScript types for API responses                  |
| `hooks/`        | Client-side React hooks (useAsyncAction)                   |
| `prisma/`       | Database schema definition                                |

## Storage Model

- **Database (Neon PostgreSQL via Prisma):** All application data — users, sessions, resumes, cover letters, analyses, interviews, and OAuth accounts.
- **No blob/file storage:** Extracted text is stored directly in the database. No original files are retained after parsing.

## Auth and Access Model

- **Better Auth** handles all authentication via email/password and optional Google OAuth.
- Sessions are stored in the PostgreSQL `Session` table with token-based cookies.
- All server actions use `withAction()` which calls `safeRequireAuth()` to verify the user and enforce ownership.
- Every `Resume` and `CoverLetter` record has a `userId` foreign key; queries always filter by the authenticated user's ID.
- Dashboard layout (`app/(dashboard)/layout.tsx`) performs a server-side session check and redirects to `/auth/login` if unauthenticated.

## Invariants

1. All AI calls go through `callAI<T>()` — never direct OpenRouter calls from actions.
2. Every mutation action wraps with `withAction()` for auth + error handling + cooldown.
3. Resume/CoverLetter queries always filter by the authenticated user's ID (ownership enforcement).
4. AI prompts always request `response_format: { type: "json_object" }` from OpenRouter.
5. `revalidatePath` is always imported from `"next/cache"`.
