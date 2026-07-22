import type { NextRequest } from "next/server";

import { createAuthCallbackSession } from "@/features/auth/auth-callback-session";
import { withRequestLogging } from "@/shared/lib/request-logging";

const successPath = "/";
const failurePath = "/login?error=oauth";

/** Exchanges the Google PKCE code for an ADR-20 HttpOnly session. */
export const GET = withRequestLogging("auth.oauth.callback", async (request) => {
  const nextRequest = request as NextRequest;
  const code = nextRequest.nextUrl.searchParams.get("code");
  const { client, redirectTo } = createAuthCallbackSession(nextRequest);

  if (!code) {
    return redirectTo(failurePath);
  }

  const { error } = await client.auth.exchangeCodeForSession(code);
  return redirectTo(error ? failurePath : successPath);
});
