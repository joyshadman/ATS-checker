# AI client (lib/ai)

## Overview

Every AI call in the app goes through `callAI<T>()` here. It talks to OpenRouter over plain `fetch`, asks for JSON output, caches results, and turns provider failures into typed error codes the server actions can show to the user.

## Key files

| File | Owns |
|---|---|
| `lib/ai/client.ts` | `callAI<T>(system, user, dedupKey?, options?)`, caching, dedup, retries, error mapping, JSON parsing |
| `lib/ai/models.ts` | `getAIModel()`, reads `OPENROUTER_MODEL` (throws if unset) |
| `lib/ai/prompts.ts` | `compressText()`, trims prompts before they are sent |
| `lib/prompts/*.ts` | The system and user prompt builders per feature (ats, job match, improve, interview) |
| `app/api/ai-test/route.ts` | Standalone GET/POST smoke test route with its own copy of the fetch logic |

## Conventions

- Always call `callAI<T>` with the response type from `types/index.ts`; it returns `AIResult<T>` (`{ success, data }` or `{ success: false, code, error, retryable? }`), never throws.
- Pass a `dedupKey` (for example a user plus resume id) for user triggered actions, so double clicks reuse one request.
- Request settings live in `executeOnce`: `temperature: 0.1`, `max_tokens: 2048`, `response_format: { type: "json_object" }`.
- Prompts are compressed before sending: system to 4000 chars, user to 16000 chars.
- `callAI` takes an optional fourth `options` argument (`maxTokens`, `timeoutMs`, `retries`, `compress`), spec 0006. Absent fields keep the defaults above. `retries: 0` means one attempt; `compress: false` sends the prompts as given. `options` is not part of the cache key, so vary the prompt or dedup key when you need a fresh answer.
- A provider answer cut off by `max_tokens` (`finish_reason: "length"`) returns `INVALID_RESPONSE` with "The AI answer was too long. Try again.", not a JSON parse error.

## Gotchas

- `OPENROUTER_MODEL` is required. `DEFAULT_MODEL` in `models.ts` is exported but not used as a fallback; with the variable unset every call fails with `MODEL_UNAVAILABLE`.
- There is no automatic fallback to other models. A failure on the configured model is returned to the caller.
- Retries: up to 2 extra attempts, backoff about 1s then 2s plus jitter, only for results marked `retryable` (500, 502, 503, empty response). A 429 is not retried.
- Four caches, all in process memory (lost on restart, not shared across serverless instances): a 5 minute SHA-256 cache of successful results keyed by prompt text, a 30 second "recent" cache keyed by `dedupKey` that also stores failures, an in flight map keyed by `dedupKey`, plus the per user cooldown in `lib/utils.ts` (`checkCooldown`, applied by `withAction`).
- The model may wrap JSON in prose; `safeParseAIResponse` falls back to extracting the first JSON object, so keep prompts asking for a single object.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
