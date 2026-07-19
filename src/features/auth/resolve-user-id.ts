import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

/**
 * ResolveUserId implementation for `withRequestLogging` (the slot OBS-02 left
 * open): verifies the session JWT via getClaims and returns the opaque user
 * id, or null for anonymous requests. Never throws — the logging wrapper
 * treats resolver failure as anonymous anyway.
 */
export async function resolveSessionUserId(): Promise<string | null> {
  try {
    const client = await createServerActionSupabaseClient();
    const { data, error } = await client.auth.getClaims();

    if (error || !data) {
      return null;
    }

    return typeof data.claims.sub === "string" ? data.claims.sub : null;
  } catch {
    return null;
  }
}
