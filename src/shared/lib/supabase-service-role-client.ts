import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleEnvironment } from "@/shared/lib/env";

export function createServiceRoleSupabaseClient(): SupabaseClient {
  const { supabaseServiceRoleKey, supabaseUrl } = getSupabaseServiceRoleEnvironment();

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
