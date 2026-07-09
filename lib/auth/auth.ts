import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma/db";
import { nextCookies } from "better-auth/next-js";
import { getBaseURL } from "@/lib/auth/url";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set. Google OAuth will not work."
  );
}

export const auth = betterAuth({
  baseURL: {
    allowedHosts: ["localhost:3000", "ats-checker-tan.vercel.app", "*.vercel.app"],
    fallback: getBaseURL(),
    protocol: "auto",
  },
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
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
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


