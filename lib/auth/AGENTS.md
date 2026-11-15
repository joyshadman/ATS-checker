# Auth (lib/auth)

## Overview

Better Auth setup for the whole app: the server config, the browser client, and the base URL rules that make the same code work on localhost, on Vercel, and on a custom domain. Sign in is Google only.

## Key files

| File | Owns |
|---|---|
| `auth.ts` | `betterAuth()` config: base URL object, Prisma adapter, Google provider, account linking, plugins, logging |
| `client.ts` | `createAuthClient` with `signIn`, `signOut`, `useSession`, used by the sign in and sign out buttons |
| `url.ts` | `getBaseURL()`, `getServerBaseURL()`, `getClientBaseURL()` |

## Conventions

- Google is the only enabled provider. Email and password is intentionally off, so `/api/auth/sign-in/email` answers `EMAIL_PASSWORD_DISABLED`. Adding it means adding `emailAndPassword: { enabled: true }` and a form.
- The server base URL uses the object form: `allowedHosts` (including `*.vercel.app` for preview deployments), `fallback: getBaseURL()`, `protocol: "auto"`. Do not replace it with a plain string, or preview URLs break.
- Sessions, accounts, and verification rows all live in Prisma through `prismaAdapter`, provider `postgresql`.
- The route handler is `toNextJsHandler(auth.handler)` in `app/api/auth/[...all]/route.ts`.
- Account linking trusts Google and does not require a verified local email, so a Google sign in attaches to an existing account with the same address.

## Gotchas

- Cookies are secure in production (`useSecureCookies`), so their names carry the `__Secure-` prefix. Toggling that setting logs everyone out.
- Changing `BETTER_AUTH_SECRET` invalidates every existing session.
- `getClientBaseURL()` reads `window.location.origin` in the browser and falls back to `BETTER_AUTH_URL`, then `VERCEL_URL`, then `http://localhost:3000` on the server. Never hardcode a host.
- Google Cloud needs every origin and redirect URI that is not localhost: the callback is `<base>/api/auth/callback/google`, and wildcards are not allowed.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
