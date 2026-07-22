import type { CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { withRequestLogging } from "@/shared/lib/request-logging";
import {
  createServerSessionSupabaseClient,
  hardenSessionCookieOptions,
} from "@/shared/lib/supabase-server-client";

const successPath = "/reset-password";
const failurePath = "/forgot-password?error=invalid-link";

/**
 * Exchanges an emailed recovery credential for an ADR-20 session. The Supabase
 * client writes rotated session cookies through the adapter onto `pendingCookies`
 * so they can be applied to the redirect response — cookies mutated via the
 * `next/headers` store are not carried onto a manually built `NextResponse`.
 */
export const GET = withRequestLogging("auth.recovery.callback", async (request) => {
  const nextRequest = request as NextRequest;
  const requestUrl = nextRequest.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  const pendingCookies: { name: string; options: CookieOptions; value: string }[] = [];
  const client = createServerSessionSupabaseClient({
    getAll: () => nextRequest.cookies.getAll(),
    setAll: (updates) => {
      for (const update of updates) {
        pendingCookies.push(update);
      }
    },
  });

  function redirectTo(path: string): NextResponse {
    const response = NextResponse.redirect(new URL(path, request.url));

    for (const { name, options, value } of pendingCookies) {
      response.cookies.set(name, value, hardenSessionCookieOptions(options));
    }

    return response;
  }

  if (tokenHash) {
    if (type !== "recovery") {
      return redirectTo(failurePath);
    }

    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });

    return redirectTo(error ? failurePath : successPath);
  }

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);

    return redirectTo(error ? failurePath : successPath);
  }

  return redirectTo(failurePath);
});
