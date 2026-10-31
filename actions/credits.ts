"use server";

import { getAiBalance } from "@/lib/ai/credits";
import { withAction } from "@/lib/action-helpers";
import type { AiBalanceView } from "@/lib/ai/credits-shared";
import type { ActionResult } from "@/types";

/** The signed in user's AI balance (spec 0004). Takes no arguments: only ever the caller's own. */
export async function getAiBalanceForUser(): Promise<ActionResult<AiBalanceView>> {
  return withAction((userId) => getAiBalance(userId));
}
