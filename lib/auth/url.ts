/**
 * Returns the base URL for the application.
 *
 * Priority:
 * 1. Explicit `BETTER_AUTH_URL` env var
 * 2. `VERCEL_URL` (set by Vercel for all deployments)
 * 3. `http://localhost:3000` (dev fallback)
 *
 * Server-safe (never accesses `window`).
 */
export function getServerBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Returns the base URL for the Better Auth client.
 *
 * - Browser: uses `window.location.origin` so it always matches the
 *   current deployment (localhost, Vercel preview, Vercel production, …).
 * - SSR / build: falls back to the same logic as `getServerBaseURL`.
 *
 * This avoids the `NEXT_PUBLIC_` inline-at-build-time problem and works
 * with any deployment URL without pre-configuration.
 */
export function getClientBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getServerBaseURL();
}
