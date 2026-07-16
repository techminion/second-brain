import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCloudIntegrationTestHarness,
  type AuthenticatedTestUser,
} from "./supabase-test-harness";

describe("knowledge_objects schema and RLS", () => {
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

  it("prevents cross-user reads and writes while preserving owner access", async () => {
    const { data: createdObject, error: createError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Owner object", type: "note" })
      .select("id, owner_id, title, type")
      .single();

    expect(createError).toBeNull();
    expect(createdObject).toMatchObject({
      owner_id: userA.id,
      title: "Owner object",
      type: "note",
    });

    if (!createdObject) {
      throw new Error("Expected the owner to create a knowledge object");
    }

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("knowledge_objects")
      .select("id")
      .eq("id", createdObject.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("knowledge_objects")
      .update({ title: "Forbidden update" })
      .eq("id", createdObject.id)
      .select("id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("knowledge_objects")
      .delete()
      .eq("id", createdObject.id)
      .select("id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client.from("knowledge_objects").insert({
      owner_id: userA.id,
      title: "Forbidden insert",
      type: "attachment",
    });

    expect(foreignInsertError).toMatchObject({ code: "42501" });

    const { data: ownObject, error: ownReadError } = await userA.client
      .from("knowledge_objects")
      .select("id, title")
      .eq("id", createdObject.id)
      .single();

    expect(ownReadError).toBeNull();
    expect(ownObject).toMatchObject({ id: createdObject.id, title: "Owner object" });
  });

  it("rejects undocumented knowledge object types", async () => {
    const { error } = await userA.client.from("knowledge_objects").insert({
      owner_id: userA.id,
      title: "Unsupported object",
      type: "pdf",
    });

    expect(error).toMatchObject({ code: "23514" });
  });
});
