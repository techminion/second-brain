import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCloudIntegrationTestHarness,
  type AuthenticatedTestUser,
} from "./supabase-test-harness";

describe("profiles RLS", () => {
  const harness = createCloudIntegrationTestHarness();
  const users: AuthenticatedTestUser[] = [];
  let userA: AuthenticatedTestUser;
  let userB: AuthenticatedTestUser;

  beforeAll(async () => {
    userA = await harness.createAuthenticatedUser();
    users.push(userA);
    userB = await harness.createAuthenticatedUser();
    users.push(userB);
  });

  afterAll(async () => {
    await harness.deleteUsers(users);
  });

  it("prevents user B from reading or updating user A while preserving self access", async () => {
    const { data: foreignProfile, error: foreignReadError } = await userB.client
      .from("profiles")
      .select("id")
      .eq("id", userA.id);

    expect(foreignReadError).toBeNull();
    expect(foreignProfile).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("profiles")
      .update({ display_name: "forbidden" })
      .eq("id", userA.id)
      .select("id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: ownProfile, error: ownReadError } = await userB.client
      .from("profiles")
      .select("id")
      .eq("id", userB.id)
      .single();

    expect(ownReadError).toBeNull();
    expect(ownProfile).toMatchObject({ id: userB.id });
  });
});
