import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const developmentProjectRef = "zkzyfwclvquiargnwgtw";

interface IntegrationEnvironment {
  supabasePublishableKey: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
}

export interface AuthenticatedTestUser {
  client: SupabaseClient;
  id: string;
}

function getIntegrationEnvironment(): IntegrationEnvironment {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
    throw new Error("Cloud integration tests require Supabase development-project credentials");
  }

  const expectedHostname = `${developmentProjectRef}.supabase.co`;

  if (new URL(supabaseUrl).hostname !== expectedHostname) {
    throw new Error("Cloud integration tests may run only against the shared development project");
  }

  return {
    supabasePublishableKey,
    supabaseServiceRoleKey,
    supabaseUrl,
  };
}

export function createCloudIntegrationTestHarness() {
  const { supabasePublishableKey, supabaseServiceRoleKey, supabaseUrl } =
    getIntegrationEnvironment();
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  async function createAuthenticatedUser(): Promise<AuthenticatedTestUser> {
    const email = `db16-${randomUUID()}@example.invalid`;
    const password = `Db16-${randomUUID()}-A1!`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
    });

    if (error || !data.user) {
      throw new Error("Unable to create an isolated Cloud integration-test user");
    }

    const client = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });

    if (signInError) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(data.user.id);

      if (cleanupError) {
        throw new Error("Unable to clean up Cloud integration-test users");
      }

      throw new Error("Unable to authenticate an isolated Cloud integration-test user");
    }

    return { client, id: data.user.id };
  }

  async function deleteUsers(users: AuthenticatedTestUser[]): Promise<void> {
    const results = await Promise.all(
      users.map(async ({ id }) => {
        const { error } = await adminClient.auth.admin.deleteUser(id);
        return error;
      }),
    );
    const cleanupError = results.find((error) => error !== null);

    if (cleanupError) {
      throw new Error("Unable to clean up Cloud integration-test users");
    }
  }

  return { createAuthenticatedUser, deleteUsers };
}
