# ATS Resume Checker — Project Overview

## What it does

ATS Resume Checker is a full-stack web application that helps job seekers optimize their resumes and cover letters for Applicant Tracking Systems (ATS). It uses AI-powered analysis via OpenRouter to score documents, suggest improvements, and generate interview preparation materials.

## Who it's for

Job seekers who want to understand how their resume performs against ATS screening and improve their chances of passing automated filters.

## Core User Flow

1. User lands on the app and is redirected to login (or dashboard if already authenticated)
2. User signs in via Google OAuth or email
3. User uploads a resume (PDF, DOCX, or TXT) from the dashboard
4. System parses the file and stores extracted text in the database
5. User can:
   - Run ATS analysis to get a score (0–100) with detailed breakdown (formatting, keywords, skills, experience, education)
   - Improve the resume with AI-generated suggestions
   - Generate interview questions based on the resume
   - Match the resume against a specific job description
6. Results are displayed with scores, breakdowns, and actionable recommendations
7. User can also upload and analyze cover letters separately

## Tech Stack

| Layer       | Technology                                          | Role                                          |
|-------------|----------------------------------------------------|-----------------------------------------------|
| Framework   | Next.js 16.2.10 (App Router) + React 19.2.4        | Full-stack SSR/CSR framework                  |
| Styling     | Tailwind CSS v4                                     | Utility-first CSS via `@import "tailwindcss"` |
| TypeScript  | Strict mode                                         | Type safety throughout                        |
| Auth        | Better Auth (v1.6.23)                               | Email/password + Google OAuth                 |
| Database    | Prisma 6.19.3 + Neon PostgreSQL                     | ORM + serverless Postgres                     |
| AI          | OpenRouter REST API                                  | Free model routing (gpt-oss-120b:free etc.)   |
| PDF Parsing | pdfjs-dist (via custom worker setup)                 | PDF text extraction with DOMMatrix polyfill    |
| DOCX        | Mammoth                                             | DOCX text extraction                          |
| Validation  | Zod                                                 | Schema validation for actions                 |

## Major Routes

| Route                     | Auth? | Type          | Description                                    |
|---------------------------|-------|---------------|------------------------------------------------|
| `/`                       | No    | Redirect      | Redirects to `/dashboard` or `/auth/login`     |
| `/auth/login`             | No    | Page          | Login with Google OAuth                        |
| `/dashboard`              | Yes   | Page          | Stats cards, upload forms, recent activity      |
| `/resumes`                | Yes   | Page          | Searchable/sortable list of all resumes        |
| `/resumes/[id]`           | Yes   | Page          | Resume detail, scores, analysis results        |
| `/cover-letters`          | Yes   | Page          | Grid of all cover letters                      |
| `/cover-letters/[id]`     | Yes   | Page          | Cover letter detail, scores, original/improved |
| `/analyze`                | Yes   | Client Page   | ATS analysis + job matching                    |
| `/interview`              | Yes   | Client Page   | Interview question generation                  |
| `/api/auth/[...all]`     | No    | API Route     | Better Auth catch-all handler                  |

## Key Files

```
package.json                 # Dependencies and scripts
app/globals.css              # Tailwind v4 + CSS custom properties (theme)
app/layout.tsx               # Root layout (Geist font, metadata)
app/page.tsx                 # Root redirect
app/auth/login/page.tsx      # Login page with hero panel
app/(dashboard)/layout.tsx   # Dashboard shell (sidebar, header, auth check)
app/(dashboard)/dashboard/page.tsx # Dashboard with stats + uploads
app/(dashboard)/resumes/     # Resume list + detail
app/(dashboard)/cover-letters/ # Cover letter list + detail
app/(dashboard)/analyze/     # ATS analysis + job match (client)
app/(dashboard)/interview/   # Interview prep (client)
components/ui/               # Shared UI components (button, card, input, etc.)
components/forms/            # Upload forms (resume, cover letter)
components/resume/           # Resume-specific components
components/cover-letter/     # Cover letter-specific components
components/auth/             # Auth-related components
actions/                     # Server Actions (auth, resume, analysis, etc.)
lib/ai/client.ts             # OpenRouter API client with caching/dedup
lib/ai/models.ts             # Model configuration
lib/auth/                    # Better Auth config, client, URL resolution
lib/parser/                  # Resume file parser (PDF, DOCX, TXT)
lib/prompts/                 # AI prompt templates (5 modules)
prisma/schema.prisma         # Database schema (User, Resume, Analysis, etc.)
types/index.ts               # TypeScript response types
hooks/use-async-action.ts    # Client-side action hook with pending/error state
```
