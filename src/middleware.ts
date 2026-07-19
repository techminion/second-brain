import { type NextRequest, NextResponse } from "next/server";

import {
  createServerSessionSupabaseClient,
  hardenSessionCookieOptions,
} from "@/shared/lib/supabase-server-client";

/**
 * Refreshes an expired Supabase access token on every matched request
 * (FR-AUTH-4): getClaims() validates the JWT and, when it has expired, uses
 * the refresh token to rotate the session, which lands in `response` through
 * the adapter with the ADR-20 hardened flags. AUTH-05 adds route protection
 * on top of this.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const client = createServerSessionSupabaseClient({
    getAll: () => request.cookies.getAll(),
    setAll: (updates) => {
      for (const { name, value } of updates) {
        request.cookies.set(name, value);
      }

      response = NextResponse.next({ request });

      for (const { name, options, value } of updates) {
        response.cookies.set(name, value, hardenSessionCookieOptions(options));
      }
    },
  });

  await client.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico|webmanifest)$).*)"],
};
