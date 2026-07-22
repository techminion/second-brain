"use server";

import { redirect } from "next/navigation";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { getRequestOrigin } from "./request-origin";

const callbackPath = "/auth/oauth/callback";
const failurePath = "/login?error=oauth";

/**
 * Starts Supabase's Google PKCE flow on the server (ADR-20). The provider and
 * callback path are fixed; browser input cannot influence either redirect.
 */
export async function signInWithGoogle(): Promise<void> {
  let destination = failurePath;

  try {
    const origin = await getRequestOrigin();
    const client = await createServerActionSupabaseClient();
    const { data, error } = await client.auth.signInWithOAuth({
      options: { redirectTo: new URL(callbackPath, origin).toString() },
      provider: "google",
    });

    if (!error && data.url) {
      destination = data.url;
    }
  } catch {
    // The fixed failure destination keeps provider/configuration errors generic.
  }

  redirect(destination);
}
