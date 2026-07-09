import { createHash } from "crypto";
import { getBaseURL } from "@/lib/auth/url";

// ───── Configuration ─────

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const OPENROUTER_API_URL = `${OPENROUTER_BASE_URL}/chat/completions`;
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30_000;

const FALLBACK_MODELS = [
  "openai/gpt-oss-120b:free",
  "google/gemini-2.5-flash:free",
  "deepseek/deepseek-v3:free",
  "qwen/qwen3:free",
];

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS = [1000, 2000, 4000];

const CACHE_TTL_MS = 5 * 60 * 1000;

const isDev = process.env.NODE_ENV === "development";

// ───── Types ─────

export type AIErrorCode =
  | "RATE_LIMIT"
  | "PROVIDER_DOWN"
  | "TIMEOUT"
  | "AUTH_ERROR"
  | "FORBIDDEN"
  | "CREDITS_EXHAUSTED"
  | "MODEL_UNAVAILABLE"
  | "ALL_PROVIDERS_FAILED"
  | "INVALID_RESPONSE"
  | "UNKNOWN";

export type AIResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      code: AIErrorCode;
      error: string;
      retryable: boolean;
      retryAfterMs?: number;
    };

// ───── In-flight dedup ─────

const inFlight = new Map<string, Promise<AIResult<unknown>>>();

// ───── Response Cache (keyed by system + user prompt, model-agnostic) ─────

const responseCache = new Map<string, { data: AIResult<unknown>; ts: number }>();

function cacheKey(systemPrompt: string, userPrompt: string): string {
  return createHash("md5")
    .update(`${systemPrompt}|${userPrompt}`)
    .digest("hex");
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
  if (responseCache.size >= 100) {
    const first = responseCache.keys().next().value;
    if (first) responseCache.delete(first);
  }
  responseCache.set(key, { data, ts: Date.now() });
}

// ───── Dev logging ─────

let reqCounter = 0;

function devLog(event: string, meta: Record<string, unknown>): void {
  if (!isDev) return;
  console.log(`[AI] ${event}`, JSON.stringify(meta));
}

// ───── Public API ─────

export async function callAI<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  dedupKey?: string,
): Promise<AIResult<T>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      code: "UNKNOWN",
      error: "OPENROUTER_API_KEY is not set. Add it to your .env file.",
      retryable: false,
    };
  }

  // Check cache (model-agnostic — any model's result serves all)
  const cKey = cacheKey(systemPrompt, userPrompt);
  const cached = cacheGet(cKey);
  if (cached) {
    devLog("cache_hit", {});
    return cached as AIResult<T>;
  }

  // Server-side dedup
  if (dedupKey) {
    const existing = inFlight.get(dedupKey);
    if (existing) {
      devLog("dedup_hit", { dedupKey });
      return (await existing) as AIResult<T>;
    }
  }

  const models = resolveModels();
  const startTime = Date.now();
  const reqId = ++reqCounter;

  const promise = executeWithFallback<T>(
    models, systemPrompt, userPrompt, apiKey, startTime, reqId,
  );

  if (dedupKey) {
    inFlight.set(dedupKey, promise);
    promise.finally(() => {
      if (inFlight.get(dedupKey) === promise) inFlight.delete(dedupKey);
    });
  }

  const result = await promise;

  if (result.success) cacheSet(cKey, result);

  const duration = Date.now() - startTime;
  devLog("callAI_complete", { reqId, duration: `${duration}ms`, success: result.success });

  return result;
}

// ───── Model resolution ─────

function resolveModels(): string[] {
  const primary = process.env.OPENROUTER_MODEL;
  if (!primary) return FALLBACK_MODELS;
  const fallbacks = FALLBACK_MODELS.filter((m) => m !== primary);
  return [primary, ...fallbacks];
}

// ───── Fallback loop ─────

async function executeWithFallback<T>(
  models: string[],
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  startTime: number,
  reqId: number,
): Promise<AIResult<T>> {
  for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
    const model = models[modelIdx];
    const modelStart = Date.now();

    const result = await executeModelWithRetries<T>(
      model, systemPrompt, userPrompt, apiKey,
    );

    const modelDuration = Date.now() - modelStart;

    devLog("model_attempt", {
      reqId,
      model,
      modelIdx,
      duration: `${modelDuration}ms`,
      success: result.success,
    });

    if (result.success) {
      devLog("model_selected", { reqId, model, duration: `${modelDuration}ms` });
      return result;
    }

    // Non-retryable errors (401, 403, credit, etc.) skip all models
    if (!result.retryable) return result;

    // If this is the last model, don't bother logging fallback
    if (modelIdx < models.length - 1) {
      devLog("model_fallback", {
        reqId,
        from: model,
        to: models[modelIdx + 1],
        code: result.code,
        duration: `${modelDuration}ms`,
      });
    }
  }

  // All models exhausted
  return {
    success: false,
    code: "ALL_PROVIDERS_FAILED",
    error:
      "All AI providers are temporarily unavailable. Please try again in a moment.",
    retryable: true,
  };
}

// ───── Per-model retry ─────

async function executeModelWithRetries<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<AIResult<T>> {
  let lastError: AIResult<T> | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const result = await executeOnce<T>(model, systemPrompt, userPrompt, apiKey);

    if (result.success) return result;

    lastError = result;

    // Don't retry if not retryable
    if (!result.retryable) return result;

    // Don't retry if we've exhausted max retries
    if (attempt >= RETRY_DELAYS.length) break;

    const delay = RETRY_DELAYS[attempt] + Math.random() * 500;
    await sleep(delay);
  }

  return lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ───── Single request ─────

async function executeOnce<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<AIResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": getBaseURL(),
        "X-Title": "ATS Resume Checker",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return handleError<T>(response);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        code: "PROVIDER_DOWN",
        error: "AI returned an empty response.",
        retryable: true,
      };
    }

    return parseJsonResponse<T>(content);
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        success: false,
        code: "TIMEOUT",
        error: "AI request timed out. The model may be overloaded — trying another model.",
        retryable: true,
      };
    }

    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      code: "UNKNOWN",
      error: message,
      retryable: true,
    };
  }
}

// ───── Error handling ─────

async function handleError<T>(response: Response): Promise<AIResult<T>> {
  const status = response.status;
  const errorBody = await response.text().catch(() => "");
  const message = parseErrorBody(errorBody);

  const retryAfter = response.headers.get("Retry-After");
  const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;

  console.error(`[AI] API error ${status}: ${message}`);

  if (status === 401) {
    return {
      success: false,
      code: "AUTH_ERROR",
      error: "Invalid API key. Check your OPENROUTER_API_KEY in .env.",
      retryable: false,
    };
  }

  if (status === 403) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Access denied. Your API key may not have access to this model.",
      retryable: false,
    };
  }

  if (status === 404) {
    return {
      success: false,
      code: "MODEL_UNAVAILABLE",
      error: "This model is currently unavailable. Switching to another model...",
      retryable: false,
    };
  }

  if (status === 429) {
    return {
      success: false,
      code: "RATE_LIMIT",
      error: "Rate limit exceeded. Trying another model...",
      retryable: true,
      retryAfterMs,
    };
  }

  if (isCreditError(errorBody)) {
    return {
      success: false,
      code: "CREDITS_EXHAUSTED",
      error:
        "Your OpenRouter credits are exhausted. Check your billing at openrouter.ai.",
      retryable: false,
    };
  }

  if (status >= 500 && RETRYABLE_STATUSES.has(status)) {
    return {
      success: false,
      code: "PROVIDER_DOWN",
      error: `Provider error (${status}). Trying another model...`,
      retryable: true,
      retryAfterMs,
    };
  }

  return {
    success: false,
    code: "UNKNOWN",
    error: `Unexpected API error (${status}). Trying another model...`,
    retryable: false,
  };
}

// ───── JSON parsing ─────

function parseJsonResponse<T>(content: string): AIResult<T> {
  try {
    const parsed = JSON.parse(content);

    if (typeof parsed !== "object" || parsed === null) {
      return {
        success: false,
        code: "INVALID_RESPONSE",
        error: "AI returned an unexpected format.",
        retryable: true,
      };
    }

    return { success: true, data: parsed as T };
  } catch {
    return {
      success: false,
      code: "INVALID_RESPONSE",
      error: "AI returned invalid JSON. Trying another model...",
      retryable: true,
    };
  }
}

// ───── Helpers ─────

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
    lower.includes("exceeded_quota") ||
    lower.includes("exceeded")
  );
}


