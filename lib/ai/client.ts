import { createHash } from "node:crypto";
import { getBaseURL } from "@/lib/auth/url";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import { compressText } from "@/lib/ai/prompts";

// ───── Env ─────

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30_000;
const MODEL = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
const MAX_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([500, 502, 503]);

// ───── Types ─────

export type AIErrorCode =
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "AUTH_ERROR"
  | "FORBIDDEN"
  | "CREDITS_EXHAUSTED"
  | "MODEL_UNAVAILABLE"
  | "PROVIDER_ERROR"
  | "INVALID_RESPONSE"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export type AIResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      code: AIErrorCode;
      error: string;
      retryable?: boolean;
    };

// ───── SHA-256 response cache (keyed by system + user) ─────

const CACHE_TTL_MS = 5 * 60 * 1000;
const responseCache = new Map<
  string,
  { data: AIResult<unknown>; ts: number }
>();

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function cacheKey(system: string, user: string): string {
  return sha256(`${system}\x00${user}`);
}

function cacheGet(key: string): AIResult<unknown> | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key: string, data: AIResult<unknown>): void {
  if (responseCache.size >= 200) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { data, ts: Date.now() });
}

// ───── In-flight dedup (keyed by dedupKey, per-process) ─────

const inFlight = new Map<string, Promise<AIResult<unknown>>>();

// ───── Recent results cache (keeps completed results for 30s to catch sequential duplicates) ─────

const RECENT_TTL_MS = 30_000;
const recentResults = new Map<
  string,
  { data: AIResult<unknown>; ts: number }
>();

function recentGet(key: string): AIResult<unknown> | null {
  const entry = recentResults.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > RECENT_TTL_MS) {
    recentResults.delete(key);
    return null;
  }
  return entry.data;
}

function recentSet(key: string, data: AIResult<unknown>): void {
  if (recentResults.size >= 500) {
    const oldest = recentResults.keys().next().value;
    if (oldest) recentResults.delete(oldest);
  }
  recentResults.set(key, { data, ts: Date.now() });
}

// ───── Request counter ─────

let reqCounter = 0;

// ───── Structured logging ─────

function log(status: string, meta: Record<string, unknown>): void {
  const fields = [
    `id=${meta.reqId ?? "?"}`,
    `model=${MODEL}`,
    `status=${status}`,
  ];
  if (meta.duration) fields.push(`duration=${meta.duration}`);
  if (meta.tokens != null) fields.push(`tokens=${meta.tokens}`);
  if (meta.cached != null) fields.push(`cached=${meta.cached}`);
  if (meta.error) fields.push(`error=${meta.error}`);

  const line = fields.join(" ");
  console.log(`[AI] ${line}`);
}

// ───── Public API ─────

export async function callAI<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  dedupKey?: string,
): Promise<AIResult<T>> {
  const reqId = ++reqCounter;
  const startTime = Date.now();

  if (!API_KEY) {
    log("fail", {
      reqId,
      error: "OPENROUTER_API_KEY not set",
      duration: "0s",
    });
    return {
      success: false,
      code: "AUTH_ERROR",
      error: "OPENROUTER_API_KEY is not set. Add it to your .env file.",
    };
  }

  // Compress prompts
  const compressedSystem = compressText(systemPrompt, 4000);
  const compressedUser = compressText(userPrompt, 16000);

  // --- Tier 1: SHA-256 response cache (exact same prompts, any time) ---
  const cKey = cacheKey(compressedSystem, compressedUser);
  const cached = cacheGet(cKey);
  if (cached) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log("ok", { reqId, cached: true, duration: `${elapsed}s` });
    return cached as AIResult<T>;
  }

  // --- Tier 2: Recent results cache (same dedupKey, within 30s) ---
  // Catches sequential duplicates where first request just finished
  if (dedupKey) {
    const recent = recentGet(dedupKey);
    if (recent) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log("ok", { reqId, cached: "recent", duration: `${elapsed}s` });
      return recent as AIResult<T>;
    }
  }

  // --- Tier 3: In-flight dedup (same dedupKey, concurrent) ---
  if (dedupKey) {
    const existing = inFlight.get(dedupKey);
    if (existing) {
      log("ok", { reqId, cached: "in-flight", duration: "0s" });
      return existing as Promise<AIResult<T>>;
    }
  }

  // Build request promise
  const promise = executeWithRetries<T>(
    compressedSystem,
    compressedUser,
    reqId,
    startTime,
  );

  if (dedupKey) {
    inFlight.set(dedupKey, promise);
    promise.finally(() => {
      if (inFlight.get(dedupKey) === promise) inFlight.delete(dedupKey);
    });
  }

  const result = await promise;

  // --- Tier 4: Cache success in SHA-256 cache ---
  if (result.success) {
    cacheSet(cKey, result);
  }

  // --- Tier 5: Cache result in recent results (even failures, to avoid re-running) ---
  if (dedupKey) {
    recentSet(dedupKey, result);
  }

  return result;
}

// ───── Execute with exponential backoff (5xx only) ─────

async function executeWithRetries<T>(
  systemPrompt: string,
  userPrompt: string,
  reqId: number,
  startTime: number,
): Promise<AIResult<T>> {
  let lastError: AIResult<T> | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(
        1000 * Math.pow(2, attempt - 1) + Math.random() * 500,
        8000,
      );
      log("retry", { reqId, attempt, delay: `${delay.toFixed(0)}ms` });
      await sleep(delay);
    }

    const result = await executeOnce<T>(
      systemPrompt,
      userPrompt,
      reqId,
      startTime,
    );

    if (result.success) return result;

    if (!result.retryable) return result;

    lastError = result;
  }

  return lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ───── Single request ─────

async function executeOnce<T>(
  systemPrompt: string,
  userPrompt: string,
  reqId: number,
  startTime: number,
): Promise<AIResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": getBaseURL(),
        "X-Title": "ATS Resume Checker",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return handleError<T>(response, reqId, startTime);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      log("fail", {
        reqId,
        error: "empty_response",
        duration: durationStr(startTime),
      });
      return {
        success: false,
        code: "PROVIDER_ERROR",
        error: "AI returned an empty response.",
        retryable: true,
      };
    }

    const tokens = data.usage?.total_tokens;
    log("ok", {
      reqId,
      tokens,
      cached: false,
      duration: durationStr(startTime),
    });

    return parseResponse<T>(content);
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof DOMException && error.name === "AbortError") {
      log("fail", {
        reqId,
        error: "timeout",
        duration: durationStr(startTime),
      });
      return {
        success: false,
        code: "TIMEOUT",
        error: "AI request timed out after 30 seconds.",
        retryable: true,
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    log("fail", { reqId, error: message, duration: durationStr(startTime) });
    return {
      success: false,
      code: "UNKNOWN",
      error: message,
      retryable: true,
    };
  }
}

// ───── Error handling ─────

async function handleError<T>(
  response: Response,
  reqId: number,
  startTime: number,
): Promise<AIResult<T>> {
  const status = response.status;
  const errorBody = await response.text().catch(() => "");
  const message = parseErrorBody(errorBody);
  const dur = durationStr(startTime);

  if (status === 401) {
    log("fail", { reqId, error: `401 ${message}`, duration: dur });
    return {
      success: false,
      code: "AUTH_ERROR",
      error: "Invalid API key. Check your OPENROUTER_API_KEY in .env.",
    };
  }

  if (status === 403) {
    log("fail", { reqId, error: `403 ${message}`, duration: dur });
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Access denied. Your API key may not have access to this model.",
    };
  }

  if (status === 404) {
    log("fail", { reqId, error: `404 ${message}`, duration: dur });
    return {
      success: false,
      code: "MODEL_UNAVAILABLE",
      error: "The configured model does not exist.",
    };
  }

  if (status === 429) {
    log("fail", { reqId, error: `429 ${message}`, duration: dur });
    return {
      success: false,
      code: "RATE_LIMIT",
      error:
        "The selected AI model is temporarily rate limited. Please try again in a minute.",
    };
  }

  if (isCreditError(errorBody)) {
    log("fail", { reqId, error: `credits ${message}`, duration: dur });
    return {
      success: false,
      code: "CREDITS_EXHAUSTED",
      error:
        "Your OpenRouter credits are exhausted. Check your billing at openrouter.ai.",
    };
  }

  if (RETRYABLE_STATUSES.has(status)) {
    log("fail", { reqId, error: `5xx ${status} ${message}`, duration: dur });
    return {
      success: false,
      code: "PROVIDER_ERROR",
      error: `Provider error (${status}). Retrying...`,
      retryable: true,
    };
  }

  log("fail", { reqId, error: `${status} ${message}`, duration: dur });
  return {
    success: false,
    code: "UNKNOWN",
    error: `Unexpected API error (${status}).`,
  };
}

// ───── Response parsing ─────

function parseResponse<T>(content: string): AIResult<T> {
  console.log("[AI] Raw response:", content);

  const { data, error } = safeParseAIResponse<T>(content);

  if (data) {
    return { success: true, data };
  }

  return {
    success: false,
    code: "INVALID_RESPONSE",
    error: error!,
    retryable: true,
  };
}

// ───── Production-ready JSON extractor ─────

/**
 * Strips markdown fences, extracts JSON, and validates the response shape.
 * Returns { data } on success or { error } on failure.
 */
function safeParseAIResponse<T>(
  content: string,
): { data: T; error: null } | { data: null; error: string } {
  const cleaned = content
    .replace(/^```(?:json)?\s*\n?/gim, "")
    .replace(/```\s*$/gim, "")
    .trim();

  // 1. Try parsing the cleaned content directly
  const direct = tryParseJSON<T>(cleaned);
  if (direct.ok) return { data: direct.data, error: null };

  // 2. Try extracting the first {...} block (handles preamble/trailing text)
  const extracted = extractFirstJSONObject(cleaned);
  if (extracted) {
    const attempt = tryParseJSON<T>(extracted);
    if (attempt.ok) return { data: attempt.data, error: null };
  }

  // 3. Try extracting the first [...] block (for array responses like questions)
  const arrayExtracted = extractFirstJSONArray(cleaned);
  if (arrayExtracted) {
    const attempt = tryParseJSON<T>(arrayExtracted);
    if (attempt.ok) return { data: attempt.data, error: null };
  }

  const hint = direct.error ?? "Could not extract valid JSON from AI response.";
  return { data: null, error: hint };
}

function tryParseJSON<T>(
  s: string,
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(s);
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "AI returned a non-object value." };
    }
    return { ok: true, data: parsed as T };
  } catch (e) {
    return {
      ok: false,
      error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function extractFirstJSONObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }

  return null;
}

function extractFirstJSONArray(s: string): string | null {
  const start = s.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }

  return null;
}

// ───── Helpers ─────

function durationStr(startTime: number): string {
  const ms = Date.now() - startTime;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function parseErrorBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message ?? body;
  } catch {
    return body;
  }
}

function isCreditError(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("insufficient") ||
    lower.includes("credits") ||
    lower.includes("payment") ||
    lower.includes("billing") ||
    lower.includes("exceeded_quota")
  );
}
