import { describe, expect, it } from "vitest";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("links schema and RLS", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("enforces one edge per object pair and owner-only access", async () => {
    const { data: objects, error: objectsCreateError } = await userA.client
      .from("knowledge_objects")
      .insert([
        { owner_id: userA.id, title: "Link source", type: "note" },
        { owner_id: userA.id, title: "Link target", type: "note" },
      ])
      .select("id");

    expect(objectsCreateError).toBeNull();
    expect(objects).toHaveLength(2);

    const sourceObject = objects?.[0];
    const targetObject = objects?.[1];

    if (!sourceObject || !targetObject) {
      throw new Error("Expected the owner to create link endpoints");
    }

    const edge = {
      owner_id: userA.id,
      source_object_id: sourceObject.id,
      target_object_id: targetObject.id,
    };
    const { data: link, error: linkCreateError } = await userA.client
      .from("links")
      .insert(edge)
      .select("id, owner_id, source_object_id, target_object_id")
      .single();

    expect(linkCreateError).toBeNull();
    expect(link).toMatchObject(edge);

    if (!link) {
      throw new Error("Expected the owner to create a link");
    }

    const { error: duplicateError } = await userA.client.from("links").insert(edge);

    expect(duplicateError).toMatchObject({ code: "23505" });

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("links")
      .select("id")
      .eq("id", link.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("links")
      .update({ target_object_id: sourceObject.id })
      .eq("id", link.id)
      .select("id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("links")
      .delete()
      .eq("id", link.id)
      .select("id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client.from("links").insert(edge);

    expect(foreignInsertError).toMatchObject({ code: "42501" });

    const { data: ownLink, error: ownReadError } = await userA.client
      .from("links")
      .select("id")
      .eq("id", link.id)
      .single();

    expect(ownReadError).toBeNull();
    expect(ownLink).toEqual({ id: link.id });
  });

  it("cascades links when either endpoint is deleted", async () => {
    const { data: objects, error: objectsCreateError } = await userA.client
      .from("knowledge_objects")
      .insert([
        { owner_id: userA.id, title: "Cascade source one", type: "note" },
        { owner_id: userA.id, title: "Cascade target one", type: "note" },
        { owner_id: userA.id, title: "Cascade source two", type: "note" },
        { owner_id: userA.id, title: "Cascade target two", type: "note" },
      ])
      .select("id");

    expect(objectsCreateError).toBeNull();
    expect(objects).toHaveLength(4);

    if (!objects || objects.length !== 4) {
      throw new Error("Expected the owner to create cascade-test endpoints");
    }

    const [sourceOne, targetOne, sourceTwo, targetTwo] = objects;
    const { data: links, error: linksCreateError } = await userA.client
      .from("links")
      .insert([
        {
          owner_id: userA.id,
          source_object_id: sourceOne.id,
          target_object_id: targetOne.id,
        },
        {
          owner_id: userA.id,
          source_object_id: sourceTwo.id,
          target_object_id: targetTwo.id,
        },
      ])
      .select("id");

    expect(linksCreateError).toBeNull();
    expect(links).toHaveLength(2);

    const { error: sourceDeleteError } = await userA.client
      .from("knowledge_objects")
      .delete()
      .eq("id", sourceOne.id);
    const { error: targetDeleteError } = await userA.client
      .from("knowledge_objects")
      .delete()
      .eq("id", targetTwo.id);

    expect(sourceDeleteError).toBeNull();
    expect(targetDeleteError).toBeNull();

    const linkIds = links?.map(({ id }) => id) ?? [];
    const { data: remainingLinks, error: linksReadError } = await userA.client
      .from("links")
      .select("id")
      .in("id", linkIds);

    expect(linksReadError).toBeNull();
    expect(remainingLinks).toEqual([]);
  });
});
