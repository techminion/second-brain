import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/shared/lib/env";

export function createBrowserSupabaseClient(): SupabaseClient {
  const { supabasePublishableKey, supabaseUrl } = getPublicEnvironment();

  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
