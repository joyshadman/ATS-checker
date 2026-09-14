export const DEFAULT_MODEL = "google/gemma-4-31b-it:free";

export function getAIModel(): string {
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!model) {
    throw new Error(
      "AI model is not configured. Set OPENROUTER_MODEL in your .env file.",
    );
  }
  return model;
}
