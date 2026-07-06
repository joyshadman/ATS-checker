import { getBaseURL } from "@/lib/env";

export function getServerBaseURL(): string {
  return getBaseURL();
}

export function getClientBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getServerBaseURL();
}
