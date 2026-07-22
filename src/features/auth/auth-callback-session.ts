import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import {
  createServerSessionSupabaseClient,
  hardenSessionCookieOptions,
} from "@/shared/lib/supabase-server-client";

interface AuthCallbackSession {
  client: SupabaseClient;
  redirectTo(path: string): NextResponse;
}

/**
 * Binds Supabase's callback cookie writes to the redirect response. Mutating
 * the request cookie store alone does not carry a new session across a manual
 * NextResponse redirect.
 */
export function createAuthCallbackSession(request: NextRequest): AuthCallbackSession {
  const pendingCookies: { name: string; options: CookieOptions; value: string }[] = [];
  const client = createServerSessionSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll: (updates) => {
      for (const update of updates) {
        pendingCookies.push(update);
      }
    },
  });

  return {
    client,
    redirectTo(path) {
      const response = NextResponse.redirect(new URL(path, request.url));

      for (const { name, options, value } of pendingCookies) {
        response.cookies.set(name, value, hardenSessionCookieOptions(options));
      }

      return response;
    },
  };
}
