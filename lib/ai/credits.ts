import { Prisma, type AiPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma/db";
import {
  AI_BALANCE_UNAVAILABLE,
  AI_FREE_USES,
  AI_LIMIT_REACHED,
  type AiBalanceView,
} from "@/lib/ai/credits-shared";

// AI usage limit and credits (spec 0004). Server only: imports Prisma and has no
// "use server", so nothing here is callable from the browser. Every write is one SQL
// statement (no interactive transaction): atomic on its own, one round trip through
// Neon's pooler, and its WHERE condition is rechecked under the row lock, so parallel
// requests can never spend more than the balance.

type SpendKind = "FREE_USE" | "CREDIT_USE";

function toView(row: { freeUsed: number; credits: number } | null): AiBalanceView {
  if (!row) return { freeLeft: AI_FREE_USES, credits: 0 };
  return { freeLeft: Math.max(0, AI_FREE_USES - row.freeUsed), credits: row.credits };
}

export async function getAiBalance(userId: string): Promise<AiBalanceView> {
  const row = await prisma.aiBalance.findUnique({
    where: { userId },
    select: { freeUsed: true, credits: true },
  });
  return toView(row);
}

/** Takes one free use or one credit plus its ledger row in a single statement; null when none is left. */
async function spend(
  userId: string,
  kind: SpendKind,
  purpose: AiPurpose,
  resumeId: string | null
): Promise<{ ledgerId: string; balance: AiBalanceView } | null> {
  const id = crypto.randomUUID();
  const now = new Date();
  const change =
    kind === "FREE_USE" ? Prisma.sql`"freeUsed" = "freeUsed" + 1` : Prisma.sql`"credits" = "credits" - 1`;
  const left = kind === "FREE_USE" ? Prisma.sql`"freeUsed" < ${AI_FREE_USES}` : Prisma.sql`"credits" > 0`;

  const rows = await prisma.$queryRaw<{ id: string; freeUsed: number; credits: number }[]>`
    WITH u AS (
      UPDATE "AiBalance" SET ${change}, "updatedAt" = ${now}
      WHERE "userId" = ${userId} AND ${left}
      RETURNING "freeUsed", "credits"
    ), l AS (
      INSERT INTO "AiLedger" ("id", "userId", "kind", "amount", "purpose", "resumeId", "createdAt")
      SELECT ${id}, ${userId}, ${kind}::"AiLedgerKind", -1, ${purpose}::"AiPurpose", ${resumeId}, ${now} FROM u
      RETURNING "id"
    )
    SELECT l."id", u."freeUsed", u."credits" FROM u, l`;

  const row = rows[0];
  return row ? { ledgerId: row.id, balance: toView(row) } : null;
}

/**
 * Reserves one AI use before the AI call: a free use while any remain, else a credit.
 * Throws AI_LIMIT_REACHED when none is left (nothing written), or AI_BALANCE_UNAVAILABLE
 * on a database error (never charges, never shows raw Prisma text).
 */
export async function reserveAiUse(
  userId: string,
  purpose: AiPurpose,
  resumeId: string | null
): Promise<{ ledgerId: string; balance: AiBalanceView }> {
  let reserved: Awaited<ReturnType<typeof spend>>;
  try {
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO "AiBalance" ("userId", "freeUsed", "credits", "createdAt", "updatedAt")
      VALUES (${userId}, 0, 0, ${now}, ${now})
      ON CONFLICT ("userId") DO NOTHING`;
    reserved =
      (await spend(userId, "FREE_USE", purpose, resumeId)) ??
      (await spend(userId, "CREDIT_USE", purpose, resumeId));
  } catch (error) {
    console.error(`[Credits] reserve failed for ${userId}:`, error);
    throw new Error(AI_BALANCE_UNAVAILABLE);
  }
  if (!reserved) throw new Error(AI_LIMIT_REACHED);
  return reserved;
}

/**
 * Gives back a reserved use after a failed AI step. Only this user's own FREE_USE or
 * CREDIT_USE row is refunded, at most once (refundOfId is unique). Never throws: a
 * failed refund is logged so the original AI error still reaches the user.
 */
export async function refundAiUse(userId: string, ledgerId: string): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date();
  try {
    await prisma.$executeRaw`
      WITH used AS (
        SELECT "id", "kind", "purpose", "resumeId" FROM "AiLedger"
        WHERE "id" = ${ledgerId} AND "userId" = ${userId} AND "kind" IN ('FREE_USE', 'CREDIT_USE')
      ), r AS (
        INSERT INTO "AiLedger" ("id", "userId", "kind", "amount", "purpose", "resumeId", "refundOfId", "createdAt")
        SELECT ${id}, ${userId}, 'REFUND', 1, "purpose", "resumeId", "id", ${now} FROM used
        ON CONFLICT ("refundOfId") DO NOTHING
        RETURNING "refundOfId"
      )
      UPDATE "AiBalance" AS b SET
        "freeUsed" = CASE WHEN used."kind" = 'FREE_USE' THEN GREATEST(0, b."freeUsed" - 1) ELSE b."freeUsed" END,
        "credits" = CASE WHEN used."kind" = 'CREDIT_USE' THEN b."credits" + 1 ELSE b."credits" END,
        "updatedAt" = ${now}
      FROM used JOIN r ON r."refundOfId" = used."id"
      WHERE b."userId" = ${userId}`;
  } catch (error) {
    console.error(`[Credits] refund of ${ledgerId} failed:`, error);
  }
}
