import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";

const developmentProjectRef = "zkzyfwclvquiargnwgtw";
const retryDelaysMs = [1_000, 2_000, 4_000] as const;

interface AuthOperationError {
  message: string;
  status?: number;
}

interface AuthOperationResult<T> {
  data: T;
  error: AuthOperationError | null;
}

interface IntegrationEnvironment {
  supabasePublishableKey: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
}

export interface AuthenticatedTestUser {
  client: SupabaseClient;
  id: string;
}

export interface ProvidedIntegrationTestUser {
  accessToken: string;
  id: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    supabaseTestUsers: ProvidedIntegrationTestUser[];
  }
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

function isRetryableAuthError(error: AuthOperationError): boolean {
  const message = error.message.toLowerCase();

  return (
    error.status === 429 ||
    message.includes("rate limit") ||
    message.includes("jwt issued at future")
  );
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function runAuthOperation<T>(
  operation: () => Promise<AuthOperationResult<T>>,
  failureMessage: string,
): Promise<T> {
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    const { data, error } = await operation();

    if (!error) {
      return data;
    }

    const retryDelay = retryDelaysMs[attempt];

    if (!isRetryableAuthError(error) || retryDelay === undefined) {
      throw new Error(failureMessage);
    }

    await wait(retryDelay);
  }

  throw new Error(failureMessage);
}

export function createCloudIntegrationTestProvisioner() {
  const { supabasePublishableKey, supabaseServiceRoleKey, supabaseUrl } =
    getIntegrationEnvironment();
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const authClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  async function createUser(): Promise<ProvidedIntegrationTestUser> {
    const email = `integration-${randomUUID()}@example.invalid`;
    const password = `Integration-${randomUUID()}-A1!`;
    const createData = await runAuthOperation(
      () =>
        adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          password,
        }),
      "Unable to create an isolated Cloud integration-test user",
    );

    if (!createData.user) {
      throw new Error("Unable to create an isolated Cloud integration-test user");
    }

    try {
      const signInData = await runAuthOperation(
        () => authClient.auth.signInWithPassword({ email, password }),
        "Unable to authenticate an isolated Cloud integration-test user",
      );

      if (!signInData.session) {
        throw new Error("Unable to authenticate an isolated Cloud integration-test user");
      }

      return {
        accessToken: signInData.session.access_token,
        id: createData.user.id,
      };
    } catch (error) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(createData.user.id);

      if (cleanupError) {
        throw new Error("Unable to clean up Cloud integration-test users", {
          cause: error,
        });
      }

      throw error;
    }
  }

  async function deleteUsers(users: ProvidedIntegrationTestUser[]): Promise<void> {
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

  return { createUser, deleteUsers };
}

export function createCloudIntegrationTestHarness(): {
  userA: AuthenticatedTestUser;
  userB: AuthenticatedTestUser;
} {
  const { supabasePublishableKey, supabaseUrl } = getIntegrationEnvironment();
  const users = inject("supabaseTestUsers");

  if (users.length !== 2) {
    throw new Error("Cloud integration tests require exactly two provisioned users");
  }

  const createAuthenticatedUser = ({
    accessToken,
    id,
  }: ProvidedIntegrationTestUser): AuthenticatedTestUser => ({
    client: createClient(supabaseUrl, supabasePublishableKey, {
      accessToken: async () => accessToken,
    }),
    id,
  });

  return {
    userA: createAuthenticatedUser(users[0]),
    userB: createAuthenticatedUser(users[1]),
  };
}
