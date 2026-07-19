import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  createServerSessionSupabaseClient,
  hardenSessionCookieOptions,
} from "@/shared/lib/supabase-server-client";

/**
 * Supabase client for server actions and route handlers: session cookies are
 * read from and written to the request's cookie store with the ADR-20
 * hardened flags. Server components cannot use this to write (Next.js makes
 * their cookie store read-only) — mutations belong in actions/handlers anyway.
 */
export async function createServerActionSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerSessionSupabaseClient({
    getAll: () => cookieStore.getAll(),
    setAll: (updates) => {
      for (const { name, options, value } of updates) {
        cookieStore.set(name, value, hardenSessionCookieOptions(options));
      }
    },
  });
}
