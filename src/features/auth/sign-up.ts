import { createBrowserSupabaseClient } from "@/shared/lib/supabase-browser-client";

import type { SignUpInput } from "./sign-up-schema";

export type SignUpFailureReason = "email-taken" | "weak-password" | "unknown";

export type SignUpResult =
  { ok: true } | { ok: false; reason: SignUpFailureReason; message: string };

const emailTakenMessage = "An account with this email already exists.";
const unknownFailureMessage = "Could not create your account. Please try again.";

/**
 * Signup talks to Supabase Auth directly from the browser — there is
 * deliberately no service-layer method for it (03_ARCHITECTURE §6.1; the
 * 05_API catalog starts after authentication).
 */
export async function signUpWithPassword(input: SignUpInput): Promise<SignUpResult> {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { message: emailTakenMessage, ok: false, reason: "email-taken" };
    }

    if (error.code === "weak_password") {
      return { message: error.message, ok: false, reason: "weak-password" };
    }

    return { message: unknownFailureMessage, ok: false, reason: "unknown" };
  }

  if (!data.session) {
    // FR-AUTH-1 requires a session at signup; a null session means the
    // project's email-confirmation setting has drifted from ADR-19.
    return { message: unknownFailureMessage, ok: false, reason: "unknown" };
  }

  return { ok: true };
}
