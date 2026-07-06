"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/auth/login");
  }

  return (
    <button onClick={handleSignOut} className="text-sm text-red-600 hover:underline text-left">
      Sign Out
    </button>
  );
}
