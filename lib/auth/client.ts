import { createAuthClient } from "better-auth/client";
import { getClientBaseURL } from "@/lib/auth/url";

export const { signIn, signOut, useSession } = createAuthClient({
  baseURL: getClientBaseURL(),
});
