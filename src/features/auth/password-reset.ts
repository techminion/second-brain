"use server";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import { type PasswordResetInput, passwordResetSchema } from "./password-reset-schema";

export type PasswordResetFailureReason =
  "invalid-input" | "invalid-session" | "weak-password" | "unknown";

export type PasswordResetResult =
  { ok: true } | { ok: false; reason: PasswordResetFailureReason; message: string };

const invalidSessionMessage = "Request a new password reset link and try again.";
const unknownFailureMessage = "Could not update your password. Please try again.";

export async function resetPassword(input: PasswordResetInput): Promise<PasswordResetResult> {
  const parsed = passwordResetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? unknownFailureMessage,
      ok: false,
      reason: "invalid-input",
    };
  }

  const client = await createServerActionSupabaseClient();
  const { data: claimsData, error: claimsError } = await client.auth.getClaims();

  if (claimsError || typeof claimsData?.claims.sub !== "string") {
    return { message: invalidSessionMessage, ok: false, reason: "invalid-session" };
  }

  const { error } = await client.auth.updateUser({ password: parsed.data.password });

  if (error?.code === "weak_password") {
    return { message: error.message, ok: false, reason: "weak-password" };
  }

  if (error?.code === "session_not_found" || error?.code === "bad_jwt") {
    return { message: invalidSessionMessage, ok: false, reason: "invalid-session" };
  }

  if (error) {
    return { message: unknownFailureMessage, ok: false, reason: "unknown" };
  }

  return { ok: true };
}
