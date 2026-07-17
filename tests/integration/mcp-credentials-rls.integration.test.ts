import { describe, expect, it } from "vitest";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("MCP credentials schema and RLS", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("stores credential metadata and permits owner lifecycle updates", async () => {
    const credential = {
      name: "Integration client",
      owner_id: userA.id,
      token_hash: "a".repeat(64),
    };
    const { data: createdCredential, error: createError } = await userA.client
      .from("mcp_credentials")
      .insert(credential)
      .select("id, name, owner_id, token_hash, created_at, last_used_at, revoked_at")
      .single();

    expect(createError).toBeNull();
    expect(createdCredential).toMatchObject({
      ...credential,
      last_used_at: null,
      revoked_at: null,
    });

    if (!createdCredential) {
      throw new Error("Expected the owner to create an MCP credential");
    }

    const lastUsedAt = new Date().toISOString();
    const revokedAt = new Date().toISOString();
    const { data: updatedCredential, error: updateError } = await userA.client
      .from("mcp_credentials")
      .update({ last_used_at: lastUsedAt, revoked_at: revokedAt })
      .eq("id", createdCredential.id)
      .select("id, last_used_at, revoked_at")
      .single();

    expect(updateError).toBeNull();
    expect(updatedCredential?.id).toBe(createdCredential.id);
    expect(new Date(updatedCredential?.last_used_at ?? "").toISOString()).toBe(lastUsedAt);
    expect(new Date(updatedCredential?.revoked_at ?? "").toISOString()).toBe(revokedAt);
  });

  it("denies every cross-user operation", async () => {
    const credential = {
      name: "Owner-only client",
      owner_id: userA.id,
      token_hash: "b".repeat(64),
    };
    const { data: createdCredential, error: createError } = await userA.client
      .from("mcp_credentials")
      .insert(credential)
      .select("id")
      .single();

    expect(createError).toBeNull();

    if (!createdCredential) {
      throw new Error("Expected the owner to create a cross-user test credential");
    }

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("mcp_credentials")
      .select("id")
      .eq("id", createdCredential.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("mcp_credentials")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", createdCredential.id)
      .select("id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("mcp_credentials")
      .delete()
      .eq("id", createdCredential.id)
      .select("id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client
      .from("mcp_credentials")
      .insert(credential);

    expect(foreignInsertError).toMatchObject({ code: "42501" });
  });
});
