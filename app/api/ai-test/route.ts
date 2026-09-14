import { NextRequest } from "next/server";
import { getAIModel } from "@/lib/ai/models";
import { getBaseURL } from "@/lib/auth/url";

const API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const TIMEOUT_MS = 30_000;

let MODEL: string;
try {
  MODEL = getAIModel();
} catch (e) {
  console.error("[AI TEST] FATAL:", e instanceof Error ? e.message : e);
  MODEL = "";
}

async function callAI(rawPrompt: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const startTime = Date.now();

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
        messages: [{ role: "user", content: rawPrompt }],
        temperature: 0.2,
        max_tokens: 256,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      const status = response.status;
      const errorBody = await response.text().catch(() => "");
      const message = parseErrorBody(errorBody);

      console.log(
        `[AI TEST]\nModel: ${MODEL}\nDuration: ${duration}ms\nStatus: ${status}\nError: ${message}`
      );

      if (status === 401) {
        return Response.json(
          { success: false, error: "Invalid API key." },
          { status: 401 }
        );
      }
      if (status === 404) {
        return Response.json(
          {
            success: false,
            error: `Model "${MODEL}" not found on the AI provider.`,
          },
          { status: 404 }
        );
      }
      if (status === 429) {
        return Response.json(
          { success: false, error: "Rate limit exceeded." },
          { status: 429 }
        );
      }
      return Response.json(
        { success: false, error: `API error (${status}): ${message}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    console.log(
      `[AI TEST]\nModel: ${MODEL}\nDuration: ${duration}ms\nStatus: ok`
    );

    return Response.json({
      success: true,
      model: MODEL,
      response: content,
      duration: `${duration}ms`,
    });
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof DOMException && error.name === "AbortError") {
      return Response.json(
        { success: false, error: "Request timed out." },
        { status: 504 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
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

export async function GET() {
  if (!API_KEY) {
    return Response.json(
      { success: false, error: "OPENROUTER_API_KEY is not set." },
      { status: 500 }
    );
  }

  if (!MODEL) {
    return Response.json(
      {
        success: false,
        error: "OPENROUTER_MODEL is not set. Add it to your .env file.",
      },
      { status: 500 }
    );
  }

  const prompt = "Reply with exactly: AI is working successfully.";
  return callAI(prompt);
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return Response.json(
      { success: false, error: "OPENROUTER_API_KEY is not set." },
      { status: 500 }
    );
  }

  if (!MODEL) {
    return Response.json(
      {
        success: false,
        error: "OPENROUTER_MODEL is not set. Add it to your .env file.",
      },
      { status: 500 }
    );
  }

  let prompt: string;
  try {
    const body = await request.json();
    prompt = body?.prompt;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return Response.json(
        { success: false, error: "A non-empty 'prompt' field is required." },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      {
        success: false,
        error: "Invalid JSON body. Send {\"prompt\": \"your text\"}.",
      },
      { status: 400 }
    );
  }

  return callAI(prompt.trim());
}
