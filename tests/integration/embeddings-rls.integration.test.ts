import { describe, expect, it } from "vitest";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("embeddings schema and RLS", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();
  const embedding = [1, ...Array<number>(1_535).fill(0)];

  it("enforces unique chunks and owner-only access", async () => {
    const { data: knowledgeObject, error: objectCreateError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Embedded object", type: "note" })
      .select("id")
      .single();

    expect(objectCreateError).toBeNull();

    if (!knowledgeObject) {
      throw new Error("Expected the owner to create an embedding source object");
    }

    const chunk = {
      chunk_index: 0,
      chunk_text: "Semantic search chunk",
      embedding,
      knowledge_object_id: knowledgeObject.id,
      owner_id: userA.id,
    };
    const { data: createdEmbedding, error: embeddingCreateError } = await userA.client
      .from("embeddings")
      .insert(chunk)
      .select("id, chunk_index, chunk_text, knowledge_object_id, owner_id")
      .single();

    expect(embeddingCreateError).toBeNull();
    expect(createdEmbedding).toMatchObject({
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      knowledge_object_id: chunk.knowledge_object_id,
      owner_id: chunk.owner_id,
    });

    if (!createdEmbedding) {
      throw new Error("Expected the owner to create an embedding");
    }

    const { error: duplicateError } = await userA.client.from("embeddings").insert(chunk);

    expect(duplicateError).toMatchObject({ code: "23505" });

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("embeddings")
      .select("id")
      .eq("id", createdEmbedding.id);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("embeddings")
      .update({ chunk_text: "Forbidden update" })
      .eq("id", createdEmbedding.id)
      .select("id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("embeddings")
      .delete()
      .eq("id", createdEmbedding.id)
      .select("id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client.from("embeddings").insert(chunk);

    expect(foreignInsertError).toMatchObject({ code: "42501" });

    const { data: ownEmbedding, error: ownReadError } = await userA.client
      .from("embeddings")
      .select("id")
      .eq("id", createdEmbedding.id)
      .single();

    expect(ownReadError).toBeNull();
    expect(ownEmbedding).toEqual({ id: createdEmbedding.id });
  });

  it("cascades embeddings when their knowledge object is deleted", async () => {
    const { data: knowledgeObject, error: objectCreateError } = await userA.client
      .from("knowledge_objects")
      .insert({ owner_id: userA.id, title: "Cascade embedding", type: "note" })
      .select("id")
      .single();

    expect(objectCreateError).toBeNull();

    if (!knowledgeObject) {
      throw new Error("Expected the owner to create a cascade-test object");
    }

    const { data: createdEmbedding, error: embeddingCreateError } = await userA.client
      .from("embeddings")
      .insert({
        chunk_index: 0,
        chunk_text: "Cascading semantic chunk",
        embedding,
        knowledge_object_id: knowledgeObject.id,
        owner_id: userA.id,
      })
      .select("id")
      .single();

    expect(embeddingCreateError).toBeNull();

    if (!createdEmbedding) {
      throw new Error("Expected the owner to create a cascade-test embedding");
    }

    const { error: objectDeleteError } = await userA.client
      .from("knowledge_objects")
      .delete()
      .eq("id", knowledgeObject.id);

    expect(objectDeleteError).toBeNull();

    const { data: remainingEmbeddings, error: embeddingReadError } = await userA.client
      .from("embeddings")
      .select("id")
      .eq("id", createdEmbedding.id);

    expect(embeddingReadError).toBeNull();
    expect(remainingEmbeddings).toEqual([]);
  });
});
