import { getServerBaseURL } from "@/lib/auth/url";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b:free";
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

export async function callAI<T = unknown>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * 2 ** attempt, 10000);
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      return await fetchModel<T>(systemPrompt, userPrompt, apiKey);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!isRetryable(lastError)) throw lastError;
    }
  }

  throw lastError ?? new Error("AI call failed. Please try again.");
}

function isRetryable(error: Error): boolean {
  const msg = error.message;
  return (
    msg.includes("Rate limit") ||
    msg.includes("timed out") ||
    msg.includes("429") ||
    msg.includes("empty response")
  );
}

async function fetchModel<T>(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": getServerBaseURL(),
        "X-Title": "ATS Resume Checker",
      },
      body: JSON.stringify({
        model: MODEL,
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
      const errorBody = await response.text();
      const status = response.status;
      const message = parseErrorBody(errorBody);

      if (status === 404) {
        throw new Error(`Model unavailable: ${message}`);
      }
      if (status === 429) {
        throw new Error(`Rate limit exceeded (429): ${message}`);
      }
      if (isCreditError(errorBody)) {
        throw new Error(`API credits exhausted. Check your OpenRouter billing.`);
      }

      throw new Error(`OpenRouter API error (${status}): ${message}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("empty response from AI");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("AI returned unexpected data");
    }

    return parsed as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }

    throw error;
  }
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
    lower.includes("billing")
  );
}
