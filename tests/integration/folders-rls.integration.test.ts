import { describe, expect, it } from "vitest";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("folders schema and RLS", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("prevents cross-user reads and writes while preserving owner access", async () => {
    const { data: parentFolder, error: parentCreateError } = await userA.client
      .from("folders")
      .insert({ name: "Parent", owner_id: userA.id })
      .select("id, name, owner_id")
      .single();

    expect(parentCreateError).toBeNull();
    expect(parentFolder).toMatchObject({ name: "Parent", owner_id: userA.id });

    if (!parentFolder) {
      throw new Error("Expected the owner to create a parent folder");
    }

    const { data: childFolder, error: childCreateError } = await userA.client
      .from("folders")
      .insert({ name: "Child", owner_id: userA.id, parent_folder_id: parentFolder.id })
      .select("id, parent_folder_id")
      .single();

    expect(childCreateError).toBeNull();
    expect(childFolder).toMatchObject({ parent_folder_id: parentFolder.id });

    if (!childFolder) {
      throw new Error("Expected the owner to create a child folder");
    }

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("folders")
      .select("id")
      .eq("id", childFolder.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("folders")
      .update({ name: "Forbidden update" })
      .eq("id", childFolder.id)
      .select("id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("folders")
      .delete()
      .eq("id", childFolder.id)
      .select("id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client
      .from("folders")
      .insert({ name: "Forbidden insert", owner_id: userA.id });

    expect(foreignInsertError).toMatchObject({ code: "42501" });

    const { data: ownFolder, error: ownReadError } = await userA.client
      .from("folders")
      .select("id, name")
      .eq("id", childFolder.id)
      .single();

    expect(ownReadError).toBeNull();
    expect(ownFolder).toMatchObject({ id: childFolder.id, name: "Child" });
  });

  it("moves children to the root when a parent is physically deleted", async () => {
    const { data: parentFolder, error: parentCreateError } = await userA.client
      .from("folders")
      .insert({ name: "Temporary parent", owner_id: userA.id })
      .select("id")
      .single();

    expect(parentCreateError).toBeNull();

    if (!parentFolder) {
      throw new Error("Expected the owner to create a temporary parent folder");
    }

    const { data: childFolder, error: childCreateError } = await userA.client
      .from("folders")
      .insert({
        name: "Temporary child",
        owner_id: userA.id,
        parent_folder_id: parentFolder.id,
      })
      .select("id")
      .single();

    expect(childCreateError).toBeNull();

    if (!childFolder) {
      throw new Error("Expected the owner to create a temporary child folder");
    }

    const { error: deleteError } = await userA.client
      .from("folders")
      .delete()
      .eq("id", parentFolder.id);

    expect(deleteError).toBeNull();

    const { data: movedChild, error: childReadError } = await userA.client
      .from("folders")
      .select("parent_folder_id")
      .eq("id", childFolder.id)
      .single();

    expect(childReadError).toBeNull();
    expect(movedChild).toEqual({ parent_folder_id: null });
  });
});
