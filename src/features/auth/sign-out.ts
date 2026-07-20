"use server";

import { redirect } from "next/navigation";

import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

/**
 * Server action (ADR-20): logout runs server-side so the refresh token is
 * revoked at Supabase and the HttpOnly session cookies are cleared through the
 * cookie adapter. Scope is `local` (ADR-22) — this session only, not every
 * device. Always redirects to /login, even if revocation errors, so a user
 * still loses its local cookie-backed session (Supabase clears storage even
 * when its remote revocation call returns an operational error).
 */
export async function signOut(): Promise<never> {
  const client = await createServerActionSupabaseClient();
  await client.auth.signOut({ scope: "local" });

  redirect("/login");
}
