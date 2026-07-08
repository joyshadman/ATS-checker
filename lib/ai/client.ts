import { getBaseURL } from "@/lib/env";
import { randomUUID } from "crypto";

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_CONCURRENT = 2;

const MODELS = [
  "openai/gpt-oss-120b:free",
  "deepseek/deepseek-chat:free",
  "qwen/qwen3-coder:free",
  "openrouter/free",
];

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS = [2000, 4000, 8000, 16000];

const MAX_FAILED_LOG = 100;

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type AIErrorCode =
  | "RATE_LIMIT"
  | "PROVIDER_DOWN"
  | "TIMEOUT"
  | "CREDITS_EXHAUSTED"
  | "MODEL_UNAVAILABLE"
  | "ALL_PROVIDERS_FAILED"
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

interface FailedRequestEntry {
  timestamp: string;
  model: string;
  requestId: string;
  code: AIErrorCode;
  error: string;
  retries: number;
  duration: number;
  status?: number;
}

// ──────────────────────────────────────────────
// Request queue (max 2 concurrent)
// ──────────────────────────────────────────────

type QueueItem = {
  resolve: () => void;
  createdAt: number;
};

const requestQueue: QueueItem[] = [];
let activeCount = 0;

function acquireQueueSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    requestQueue.push({ resolve, createdAt: Date.now() });
  });
}

function releaseQueueSlot(): void {
  const next = requestQueue.shift();
  if (next) {
    next.resolve();
  } else {
    activeCount = Math.max(0, activeCount - 1);
  }
}

// ──────────────────────────────────────────────
// In-flight dedup
// ──────────────────────────────────────────────

const inFlight = new Map<string, Promise<unknown>>();

// ──────────────────────────────────────────────
// Failed request storage
// ──────────────────────────────────────────────

const failedRequests: FailedRequestEntry[] = [];

function recordFailedRequest(entry: Omit<FailedRequestEntry, "timestamp">): void {
  const full: FailedRequestEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  failedRequests.push(full);
  if (failedRequests.length > MAX_FAILED_LOG) {
    failedRequests.shift();
  }
  console.error(`[AI_FAILED]`, JSON.stringify(full));
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export async function callAI<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  dedupKey?: string
): Promise<AIResult<T>> {
  if (dedupKey) {
    const existing = inFlight.get(dedupKey);
    if (existing) return existing as Promise<AIResult<T>>;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      code: "UNKNOWN",
      error: "OPENROUTER_API_KEY is not set",
      retryable: false,
    };
  }

  const promise = runWithQueue<T>(systemPrompt, userPrompt, apiKey);

  if (dedupKey) {
    inFlight.set(dedupKey, promise);
    promise.finally(() => inFlight.delete(dedupKey));
  }

  return promise;
}

// ──────────────────────────────────────────────
// Queue wrapper
// ──────────────────────────────────────────────

async function runWithQueue<T>(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<AIResult<T>> {
  await acquireQueueSlot();
  try {
    return await executeWithFallback<T>(systemPrompt, userPrompt, apiKey);
  } finally {
    releaseQueueSlot();
  }
}

// ──────────────────────────────────────────────
// Model fallback loop
// ──────────────────────────────────────────────

async function executeWithFallback<T>(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<AIResult<T>> {
  for (let modelIndex = 0; modelIndex < MODELS.length; modelIndex++) {
    const model = MODELS[modelIndex];
    const result = await tryModelWithRetries<T>(
      model,
      systemPrompt,
      userPrompt,
      apiKey,
    );

    if (result.success) return result;

    if (modelIndex < MODELS.length - 1) {
      console.log(
        JSON.stringify({
          event: "ai_fallback",
          fromModel: model,
          nextModel: MODELS[modelIndex + 1],
          code: result.code,
          error: result.error,
        }),
      );
    }
  }

  const errorResult: AIResult<T> = {
    success: false,
    code: "ALL_PROVIDERS_FAILED",
    error: "All AI providers are temporarily unavailable.",
    retryable: true,
  };

  console.error(`[AI] All ${MODELS.length} models failed`, JSON.stringify(errorResult));
  return errorResult;
}

// ──────────────────────────────────────────────
// Per-model retry loop
// ──────────────────────────────────────────────

async function tryModelWithRetries<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<AIResult<T>> {
  const requestId = randomUUID().slice(0, 8);
  const startTime = Date.now();

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const result = await tryModelOnce<T>(
      model,
      systemPrompt,
      userPrompt,
      apiKey,
      requestId,
    );

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(
        JSON.stringify({
          event: "ai_success",
          timestamp: new Date().toISOString(),
          model,
          requestId,
          duration,
          retries: attempt,
          status: 200,
        }),
      );
      return result;
    }

    const isRetryable = result.retryable && RETRY_STATUSES.has(extractStatusCode(result.error));

    if (!isRetryable || attempt >= RETRY_DELAYS.length) {
      recordFailedRequest({
        model,
        requestId,
        code: result.code,
        error: result.error,
        retries: attempt,
        duration,
        status: extractStatusCode(result.error) || undefined,
      });

      return result;
    }

    const baseDelay = RETRY_DELAYS[attempt];
    const retryAfter = result.retryAfterMs ?? 0;
    const delay = Math.max(baseDelay, retryAfter);

    console.log(
      JSON.stringify({
        event: "ai_retry",
        timestamp: new Date().toISOString(),
        model,
        requestId,
        attempt: attempt + 1,
        maxRetries: RETRY_DELAYS.length,
        waitMs: delay,
        baseDelay,
        retryAfterMs: result.retryAfterMs,
        code: result.code,
        error: result.error,
      }),
    );

    await new Promise((r) => setTimeout(r, delay));
  }

  return {
    success: false,
    code: "PROVIDER_DOWN",
    error: "AI provider unavailable.",
    retryable: true,
  };
}

// ──────────────────────────────────────────────
// Single HTTP call
// ──────────────────────────────────────────────

async function tryModelOnce<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  requestId: string,
): Promise<AIResult<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      const errorBody = await response.text();
      const message = parseErrorBody(errorBody);
      const retryAfter = response.headers.get("Retry-After");
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;

      if (status === 404) {
        return {
          success: false,
          code: "MODEL_UNAVAILABLE",
          error: `Model unavailable (404): ${message}`,
          retryable: true,
        };
      }

      if (status === 429) {
        return {
          success: false,
          code: "RATE_LIMIT",
          error: `Rate limit exceeded (429): ${message}`,
          retryable: true,
          retryAfterMs,
        };
      }

      if (isCreditError(errorBody)) {
        return {
          success: false,
          code: "CREDITS_EXHAUSTED",
          error: "API credits exhausted. Check your OpenRouter billing.",
          retryable: false,
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          code: "PROVIDER_DOWN",
          error: `Provider error (${status}): ${message}`,
          retryable: true,
          retryAfterMs,
        };
      }

      return {
        success: false,
        code: "UNKNOWN",
        error: `OpenRouter API error (${status}): ${message}`,
        retryable: false,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const provider = data.provider ?? "unknown";
    const usage = data.usage ?? {};
    const totalTokens = (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);

    if (!content) {
      return {
        success: false,
        code: "PROVIDER_DOWN",
        error: "empty response from AI",
        retryable: true,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        success: false,
        code: "UNKNOWN",
        error: "AI returned invalid JSON",
        retryable: false,
      };
    }

    if (typeof parsed !== "object" || parsed === null) {
      return {
        success: false,
        code: "UNKNOWN",
        error: "AI returned unexpected data",
        retryable: false,
      };
    }

    console.log(
      JSON.stringify({
        event: "ai_response",
        timestamp: new Date().toISOString(),
        model,
        provider,
        requestId,
        tokens: totalTokens,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
      }),
    );

    return { success: true, data: parsed as T };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        success: false,
        code: "TIMEOUT",
        error: `AI request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
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

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

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
    lower.includes("exceeded")
  );
}

function extractStatusCode(error: string): number {
  if (!error) return 0;
  const match = error.match(/\((\d+)\)/);
  return match ? parseInt(match[1], 10) : 0;
}
