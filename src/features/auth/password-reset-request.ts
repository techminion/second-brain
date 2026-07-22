"use server";

import { headers } from "next/headers";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

import {
  type PasswordResetRequestInput,
  passwordResetRequestSchema,
} from "./password-reset-request-schema";

export type PasswordResetRequestFailureReason = "invalid-input" | "unknown";

export type PasswordResetRequestResult =
  | { ok: true; message: string }
  | { ok: false; reason: PasswordResetRequestFailureReason; message: string };

const successMessage = "If an account exists for that email, we sent a link to reset its password.";
const unknownFailureMessage = "Could not request a password reset. Please try again.";

function parseForwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

export async function getRequestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin");
  const forwardedHost = parseForwardedValue(requestHeaders.get("x-forwarded-host"));
  const host = forwardedHost ?? parseForwardedValue(requestHeaders.get("host"));

  if (!requestOrigin || !host || /[\s/?#\\]/.test(host)) {
    throw new Error("Missing or invalid request origin");
  }

  const origin = new URL(requestOrigin);
  const forwardedProtocol = parseForwardedValue(requestHeaders.get("x-forwarded-proto"));

  if (
    (origin.protocol !== "http:" && origin.protocol !== "https:") ||
    origin.host !== host ||
    (forwardedProtocol && `${forwardedProtocol}:` !== origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/"
  ) {
    throw new Error("Invalid request origin");
  }

  return origin.origin;
}

/**
 * Server action (ADR-20): the PKCE verifier and all auth state remain in
 * HttpOnly cookies. The redirect path is fixed here, never accepted as input.
 */
export async function requestPasswordReset(
  input: PasswordResetRequestInput,
): Promise<PasswordResetRequestResult> {
  const parsed = passwordResetRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      message: parsed.error.issues[0]?.message ?? unknownFailureMessage,
      ok: false,
      reason: "invalid-input",
    };
  }

  try {
    const origin = await getRequestOrigin();
    const client = await createServerActionSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: new URL("/auth/recovery/callback", origin).toString(),
    });

    if (error) {
      return { message: unknownFailureMessage, ok: false, reason: "unknown" };
    }

    return { message: successMessage, ok: true };
  } catch {
    return { message: unknownFailureMessage, ok: false, reason: "unknown" };
  }
}
