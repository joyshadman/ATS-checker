// AI usage limit and credits (spec 0004): values the editor and the server both
// need. No imports, so browser code can use it; the charging lives in credits.ts.

export const AI_FREE_USES = 5;
export const PRICING_PATH = "/pricing";
export const AI_LIMIT_REACHED = `You have used your ${AI_FREE_USES} free AI uses. Get credits to keep writing with AI.`;
export const AI_BALANCE_UNAVAILABLE = "Could not check your AI balance. Try again.";

export type AiBalanceView = { freeLeft: number; credits: number };

/** Uses left in total: free uses plus credits. */
export function balanceTotal(balance: AiBalanceView): number {
  return balance.freeLeft + balance.credits;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The one wording of a balance (editor and pricing page): free uses first, then credits. */
export function balanceLabel(balance: AiBalanceView): string {
  if (balanceTotal(balance) === 0) return "No AI uses left";
  return balance.freeLeft > 0
    ? count(balance.freeLeft, "free AI use left", "free AI uses left")
    : count(balance.credits, "credit", "credits");
}
