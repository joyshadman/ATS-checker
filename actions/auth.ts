"use server";

import { cache } from "react";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import type { ActionResult } from "@/types";

export const getSession = cache(async () => {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    return session;
  } catch (error) {
    console.error("[auth] getSession error:", error);
    return null;
  }
});

export async function getCurrentUser() {
  try {
    const session = await getSession();
    return session?.user ?? null;
  } catch (error) {
    console.error("[auth] getCurrentUser error:", error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    console.error("[auth] requireAuth failed — no authenticated user");
    throw new Error("Unauthorized");
  }
  return user;
}

export async function safeRequireAuth(): Promise<
  ActionResult<{ id: string; name: string | null; email: string }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "You must be logged in to perform this action" };
    }
    return { success: true, data: { id: user.id, name: user.name, email: user.email } };
  } catch (error) {
    console.error("[auth] safeRequireAuth error:", error);
    return { success: false, error: "Authentication failed. Please try logging in again." };
  }
}
