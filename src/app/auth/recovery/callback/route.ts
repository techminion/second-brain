import type { NextRequest } from "next/server";

import { createAuthCallbackSession } from "@/features/auth/auth-callback-session";
import { withRequestLogging } from "@/shared/lib/request-logging";

const successPath = "/reset-password";
const failurePath = "/forgot-password?error=invalid-link";

/**
 * Exchanges an emailed recovery credential for an ADR-20 session. The Supabase
 * client writes rotated session cookies onto the redirect response through the
 * shared callback adapter.
 */
export const GET = withRequestLogging("auth.recovery.callback", async (request) => {
  const nextRequest = request as NextRequest;
  const requestUrl = nextRequest.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const { client, redirectTo } = createAuthCallbackSession(nextRequest);

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
