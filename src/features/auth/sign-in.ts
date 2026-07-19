"use server";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { type SignInInput, signInSchema } from "./sign-in-schema";

export type SignInFailureReason = "invalid-credentials" | "invalid-input" | "unknown";

export type SignInResult =
  { ok: true } | { ok: false; reason: SignInFailureReason; message: string };

// One neutral message for any credential mismatch — never reveals whether
// the account exists (09_SECURITY §9 T8).
const invalidCredentialsMessage = "Incorrect email or password.";
const unknownFailureMessage = "Could not log you in. Please try again.";

/**
 * Server action (ADR-20): tokens never reach browser JavaScript — Supabase
 * Auth is called here and the session lands in HttpOnly cookies.
 */
export async function signInWithPassword(input: SignInInput): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? unknownFailureMessage,
      ok: false,
      reason: "invalid-input",
    };
  }

  const client = await createServerActionSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
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
