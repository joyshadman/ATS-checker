import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma/db";
import { nextCookies } from "better-auth/next-js";
import { getServerBaseURL } from "@/lib/auth/url";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set. Google OAuth will not work."
  );
}

const baseURL = getServerBaseURL();

console.log(`[auth] Better Auth baseURL: ${baseURL}`);
if (googleClientId) console.log(`[auth] Google OAuth client ID: ${googleClientId.slice(0, 8)}...`);

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [nextCookies()],
  account: {
    accountLinking: {
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  logger: {
    disabled: false,
    level: "info",
    log(level, message, ...args) {
      const prefix = `[auth:${level}]`;
      if (level === "error") {
        console.error(prefix, message, ...args);
      } else if (level === "warn") {
        console.warn(prefix, message, ...args);
      } else {
        console.log(prefix, message, ...args);
      }
    },
  },
  onAPIError: {
    onError(error) {
      console.error("[auth:error] API error:", error);
    },
  },
});
