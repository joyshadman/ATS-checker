// Adds AI credits to one account (spec 0004). The only way to grant until payments exist.
// Usage: npm run credits:grant -- <email> <amount> [note]

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const MAX_AMOUNT = 10000;
const MAX_NOTE = 200;

function fail(message) {
  console.error(`credits:grant: ${message}`);
  console.error("Usage: npm run credits:grant -- <email> <amount> [note]");
  process.exitCode = 1;
}

async function main(prisma) {
  const [rawEmail, rawAmount, ...noteParts] = process.argv.slice(2);
  const email = (rawEmail ?? "").trim().toLowerCase();
  if (!email) return fail("an email is required");

  // Digits only, so "1e3", " 5", "0x10", "2.5", and negatives are all rejected.
  if (!/^\d+$/.test(rawAmount ?? "")) return fail(`amount must be a whole number from 1 to ${MAX_AMOUNT}`);
  const amount = Number(rawAmount);
  if (amount < 1 || amount > MAX_AMOUNT) return fail(`amount must be a whole number from 1 to ${MAX_AMOUNT}`);

  const note = noteParts.join(" ").trim().slice(0, MAX_NOTE) || null;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (!user) return fail(`no account with email ${email}`);

  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO "AiBalance" ("userId", "freeUsed", "credits", "createdAt", "updatedAt")
    VALUES (${user.id}, 0, 0, ${now}, ${now})
    ON CONFLICT ("userId") DO NOTHING`;

  // Balance and GRANT ledger row change in one statement, so they never drift.
  const rows = await prisma.$queryRaw`
    WITH b AS (
      UPDATE "AiBalance" SET "credits" = "credits" + ${amount}, "updatedAt" = ${now}
      WHERE "userId" = ${user.id}
      RETURNING "credits"
    ), l AS (
      INSERT INTO "AiLedger" ("id", "userId", "kind", "amount", "note", "createdAt")
      SELECT ${randomUUID()}, ${user.id}, 'GRANT', ${amount}, ${note}, ${now} FROM b
      RETURNING "id"
    )
    SELECT b."credits" FROM b, l`;

  const credits = rows[0]?.credits;
  if (credits === undefined) return fail("the balance could not be updated, nothing was granted");
  console.log(`${user.email}: ${credits} ${credits === 1 ? "credit" : "credits"}`);
}

const prisma = new PrismaClient();
try {
  await main(prisma);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await prisma.$disconnect();
}
