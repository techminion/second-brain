import { type CookieOptions, createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnvironment, isProductionEnvironment } from "@/shared/lib/env";

interface SessionCookie {
  name: string;
  value: string;
}

interface SessionCookieUpdate extends SessionCookie {
  options: CookieOptions;
}

export interface SessionCookieAdapter {
  getAll(): SessionCookie[];
  setAll(cookies: SessionCookieUpdate[]): void;
}

/**
 * 09_SECURITY §3 / ADR-20: session cookies are HttpOnly + SameSite=Lax
 * everywhere, and Secure in production (plain-HTTP localhost drops Secure
 * cookies in some browsers — same rule as the theme cookie). Every writer of
 * session cookies must pass its options through here.
 */
export function hardenSessionCookieOptions(options: CookieOptions): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment,
  };
}

export function createServerSessionSupabaseClient(
  cookieAdapter: SessionCookieAdapter,
): SupabaseClient {
  const { supabasePublishableKey, supabaseUrl } = getPublicEnvironment();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: cookieAdapter,
  });
}
