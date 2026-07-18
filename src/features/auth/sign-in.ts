import { createBrowserSupabaseClient } from "@/shared/lib/supabase-browser-client";

import type { SignInInput } from "./sign-in-schema";

export type SignInFailureReason = "invalid-credentials" | "unknown";

export type SignInResult =
  { ok: true } | { ok: false; reason: SignInFailureReason; message: string };

// One neutral message for any credential mismatch — never reveals whether
// the account exists (09_SECURITY §9 T8).
const invalidCredentialsMessage = "Incorrect email or password.";
const unknownFailureMessage = "Could not log you in. Please try again.";

export async function signInWithPassword(input: SignInInput): Promise<SignInResult> {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    if (error.code === "invalid_credentials") {
      return { message: invalidCredentialsMessage, ok: false, reason: "invalid-credentials" };
    }

    return { message: unknownFailureMessage, ok: false, reason: "unknown" };
  }

  if (!data.session) {
    return { message: unknownFailureMessage, ok: false, reason: "unknown" };
  }

  return { ok: true };
}
