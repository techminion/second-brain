import { createClient } from "@supabase/supabase-js";

// The dev server loads .env itself; the specs need the same values for
// service-role cleanup. Node 22+. In CI the values arrive as plain env vars.
try {
  process.loadEnvFile(".env");
} catch {
  // Missing .env — each spec's skip guard reports it.
}

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("e2e admin client requires dev-project credentials");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function deleteUserByEmail(email: string): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new Error(`e2e cleanup failed listing users: ${error.message}`);
  }

  const user = data.users.find((candidate) => candidate.email === email);

  if (user) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw new Error(`e2e cleanup failed deleting ${user.id}: ${deleteError.message}`);
    }
  }
}
