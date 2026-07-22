import { type NextRequest, NextResponse } from "next/server";

import {
  createServerSessionSupabaseClient,
  hardenSessionCookieOptions,
} from "@/shared/lib/supabase-server-client";

const publicPagePaths = new Set([
  "/auth/recovery/callback",
  "/forgot-password",
  "/login",
  "/signup",
]);

function isProtectedPageRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  return !pathname.startsWith("/api/") && !publicPagePaths.has(pathname);
}

/**
 * Refreshes an expired Supabase access token on every matched request
 * (FR-AUTH-4): getClaims() validates the JWT and, when it has expired, uses
 * the refresh token to rotate the session, which lands in `response` through
 * the adapter with the ADR-20 hardened flags. Page routes outside the public
 * auth surface require verified claims (AUTH-05).
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

  let isAuthenticated = false;

  try {
    const { data, error } = await client.auth.getClaims();
    isAuthenticated = !error && typeof data?.claims.sub === "string";
  } catch {
    // Authentication failures must fail closed for protected page routes.
  }

  if (isProtectedPageRequest(request) && !isAuthenticated) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));

    // A failed/expired session can clear or rotate cookies before redirecting.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico|webmanifest)$).*)"],
};
