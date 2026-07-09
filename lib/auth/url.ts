export function getBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getServerBaseURL(): string {
  return getBaseURL();
}

export function getClientBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getServerBaseURL();
}
