import { type CookieOptions, createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/shared/lib/env";

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

export function createServerSessionSupabaseClient(
  cookieAdapter: SessionCookieAdapter,
): SupabaseClient {
  const { supabasePublishableKey, supabaseUrl } = getPublicEnvironment();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: cookieAdapter,
  });
}
