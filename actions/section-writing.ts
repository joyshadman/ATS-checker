"use server";

import { callAI } from "@/lib/ai/client";
import { withAction, loadResumeWithAuth } from "@/lib/action-helpers";
import { zodIssueMessage } from "@/lib/resume/content";
import {
  AI_COOLDOWN_MS,
  cleanSectionSuggestion,
  hasSomethingToWrite,
  NOTHING_TO_WRITE,
  sectionWritingInputSchema,
  targetKeyOf,
} from "@/lib/resume/section-writing";
import { buildSectionWritingPrompt, SECTION_WRITING_SYSTEM_PROMPT } from "@/lib/prompts/section-writing";
import type { ActionResult, SectionSuggestion, SectionWritingAIResponse } from "@/types";

/**
 * Writes or rewrites one editor target with AI (spec 0003). Reads the user's unsaved
 * text from the input, never writes to the database. The single entry point feature 4
 * will count and gate.
 */
export async function writeResumeSection(input: unknown): Promise<ActionResult<SectionSuggestion>> {
  return withAction(
    async (userId) => {
      const parsed = sectionWritingInputSchema.safeParse(input);
      if (!parsed.success) throw new Error(zodIssueMessage(parsed.error));
      const { resumeId, target, context, targetRole, style, nonce } = parsed.data;

      const resume = await loadResumeWithAuth(userId, resumeId);
      if (resume.content === null) throw new Error("This resume has no sections");

      if (!hasSomethingToWrite(target, context)) throw new Error(NOTHING_TO_WRITE);

      // The nonce is in the prompt and the dedup key, so neither cache replays an
      // earlier answer (5 min prompt cache, 30 s dedup cache incl. failures).
      const aiResult = await callAI<SectionWritingAIResponse>(
        SECTION_WRITING_SYSTEM_PROMPT,
        buildSectionWritingPrompt({ target, context, targetRole, style, nonce }),
        `write:${userId}:${resumeId}:${targetKeyOf(target)}:${nonce}`
      );

      if (!aiResult.success) throw new Error(aiResult.error);

      return cleanSectionSuggestion(target, aiResult.data);
    },
    { cooldown: true, cooldownKey: "ai-write", cooldownMs: AI_COOLDOWN_MS }
  );
}
