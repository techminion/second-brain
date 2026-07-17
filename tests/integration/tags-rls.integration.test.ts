import { describe, expect, it } from "vitest";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("tags schema and RLS", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("enforces case-insensitive uniqueness and owner-only tag access", async () => {
    const { data: tag, error: createError } = await userA.client
      .from("tags")
      .insert({ name: "Research", owner_id: userA.id })
      .select("id, name, owner_id")
      .single();

    expect(createError).toBeNull();
    expect(tag).toMatchObject({ name: "Research", owner_id: userA.id });

    if (!tag) {
      throw new Error("Expected the owner to create a tag");
    }

    const { error: duplicateError } = await userA.client
      .from("tags")
      .insert({ name: "research", owner_id: userA.id });

    expect(duplicateError).toMatchObject({ code: "23505" });

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("tags")
      .select("id")
      .eq("id", tag.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("tags")
      .update({ name: "Forbidden update" })
      .eq("id", tag.id)
      .select("id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("tags")
      .delete()
      .eq("id", tag.id)
      .select("id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client
      .from("tags")
      .insert({ name: "Forbidden insert", owner_id: userA.id });

    expect(foreignInsertError).toMatchObject({ code: "42501" });

    const { data: ownTag, error: ownReadError } = await userA.client
      .from("tags")
      .select("id, name")
      .eq("id", tag.id)
      .single();

    expect(ownReadError).toBeNull();
    expect(ownTag).toEqual({ id: tag.id, name: "Research" });
  });

  it("protects object-tag associations and cascades tag deletion", async () => {
    const { data: knowledgeObject, error: objectCreateError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Tagged object", type: "note" })
      .select("id")
      .single();
    const { data: tag, error: tagCreateError } = await userA.client
      .from("tags")
      .insert({ name: "Cascade", owner_id: userA.id })
      .select("id")
      .single();

    expect(objectCreateError).toBeNull();
    expect(tagCreateError).toBeNull();

    if (!knowledgeObject || !tag) {
      throw new Error("Expected the owner to create an object and tag");
    }

    const association = {
      knowledge_object_id: knowledgeObject.id,
      owner_id: userA.id,
      tag_id: tag.id,
    };
    const { data: objectTag, error: associationCreateError } = await userA.client
      .from("knowledge_object_tags")
      .insert(association)
      .select("knowledge_object_id, tag_id, owner_id")
      .single();

    expect(associationCreateError).toBeNull();
    expect(objectTag).toEqual(association);

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("knowledge_object_tags")
      .select("knowledge_object_id")
      .eq("knowledge_object_id", knowledgeObject.id)
      .eq("tag_id", tag.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("knowledge_object_tags")
      .update({ owner_id: userB.id })
      .eq("knowledge_object_id", knowledgeObject.id)
      .eq("tag_id", tag.id)
      .select("knowledge_object_id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("knowledge_object_tags")
      .delete()
      .eq("knowledge_object_id", knowledgeObject.id)
      .eq("tag_id", tag.id)
      .select("knowledge_object_id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client
      .from("knowledge_object_tags")
      .insert(association);

    expect(foreignInsertError).toMatchObject({ code: "42501" });

    const { error: tagDeleteError } = await userA.client.from("tags").delete().eq("id", tag.id);

    expect(tagDeleteError).toBeNull();

    const { data: remainingAssociations, error: associationReadError } = await userA.client
      .from("knowledge_object_tags")
      .select("knowledge_object_id")
      .eq("knowledge_object_id", knowledgeObject.id);

    expect(associationReadError).toBeNull();
    expect(remainingAssociations).toEqual([]);
  });
});
