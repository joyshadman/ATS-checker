"use server";

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

export async function getSession() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    return session;
  } catch (error) {
    console.error("[auth] getSession error:", error);
    return null;
  }
}

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
