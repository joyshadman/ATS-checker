# AI Workflow Rules

## Approach

This project is built incrementally using context files as the source of truth. Each session should implement one focused unit of work, verified end-to-end before moving on.

## Scoping Rules

- Work on one feature unit at a time
- Prefer small, verifiable increments over large speculative changes
- Do not combine unrelated system boundaries in a single implementation step

## When to Split Work

Split an implementation step if it combines:

- UI changes and backend logic changes
- Multiple unrelated API routes or server actions
- Behavior not clearly defined in the context files

If a change cannot be verified end-to-end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the context files
- If a requirement is ambiguous, resolve it in the relevant context file before implementing
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing

## Protected Files

Do not modify the following unless explicitly instructed:

- `lib/ai/client.ts` — AI client with caching, dedup, and retry logic
- `lib/ai/models.ts` — Model configuration
- `lib/auth/auth.ts` — Better Auth server config
- `lib/auth/client.ts` — Better Auth client config
- `lib/prompts/` — AI prompt templates
- `prisma/schema.prisma` — Database schema

## Keeping Docs in Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Feature scope

## Before Moving to the Next Unit

1. The current unit works end-to-end within its defined scope
2. No invariant defined in `architecture.md` was violated
3. `progress-tracker.md` reflects the completed work
4. `npm run build` passes
