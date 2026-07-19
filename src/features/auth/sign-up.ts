"use server";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { type SignUpInput, signUpSchema } from "./sign-up-schema";

export type SignUpFailureReason = "email-taken" | "invalid-input" | "weak-password" | "unknown";

export type SignUpResult =
  { ok: true } | { ok: false; reason: SignUpFailureReason; message: string };

const emailTakenMessage = "An account with this email already exists.";
const unknownFailureMessage = "Could not create your account. Please try again.";

/**
 * Server action (ADR-20): tokens never reach browser JavaScript — Supabase
 * Auth is called here and the session lands in HttpOnly cookies. There is
 * deliberately no service-layer method for signup (03_ARCHITECTURE §6.1; the
 * 05_API catalog starts after authentication).
 */
export async function signUpWithPassword(input: SignUpInput): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? unknownFailureMessage,
      ok: false,
      reason: "invalid-input",
    };
  }

  const client = await createServerActionSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
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
