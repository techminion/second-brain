import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createCloudIntegrationTestHarness,
  type AuthenticatedTestUser,
} from "./supabase-test-harness";

describe("notes schema and RLS", () => {
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

  async function createNoteEnvelope(user: AuthenticatedTestUser, title: string): Promise<string> {
    const { data, error } = await user.client
      .from("knowledge_objects")
      .insert({ owner_id: user.id, title, type: "note" })
      .select("id")
      .single();

    expect(error).toBeNull();

    if (!data) {
      throw new Error("Expected the owner to create a note envelope");
    }

    return data.id as string;
  }

  it("generates searchable content and preserves owner-only access", async () => {
    const knowledgeObjectId = await createNoteEnvelope(userA, "Search envelope");
    const { data: folder, error: folderError } = await userA.client
      .from("folders")
      .insert({ name: "Research", owner_id: userA.id })
      .select("id")
      .single();

    expect(folderError).toBeNull();

    if (!folder) {
      throw new Error("Expected the owner to create a note folder");
    }

    const { data: note, error: createError } = await userA.client
      .from("notes")
      .insert({
        body: "A durable retrieval strategy",
        folder_id: folder.id,
        knowledge_object_id: knowledgeObjectId,
        owner_id: userA.id,
        title: "Search architecture",
      })
      .select("knowledge_object_id, owner_id, title, body, folder_id")
      .single();

    expect(createError).toBeNull();
    expect(note).toMatchObject({
      body: "A durable retrieval strategy",
      folder_id: folder.id,
      knowledge_object_id: knowledgeObjectId,
      owner_id: userA.id,
      title: "Search architecture",
    });

    const { data: searchResults, error: searchError } = await userA.client
      .from("notes")
      .select("knowledge_object_id")
      .textSearch("search_vector", "strategy", { config: "english" });

    expect(searchError).toBeNull();
    expect(searchResults).toEqual([{ knowledge_object_id: knowledgeObjectId }]);

    const { data: foreignRead, error: foreignReadError } = await userB.client
      .from("notes")
      .select("knowledge_object_id")
      .eq("knowledge_object_id", knowledgeObjectId);

    expect(foreignReadError).toBeNull();
    expect(foreignRead).toEqual([]);

    const { data: foreignUpdate, error: foreignUpdateError } = await userB.client
      .from("notes")
      .update({ title: "Forbidden update" })
      .eq("knowledge_object_id", knowledgeObjectId)
      .select("knowledge_object_id");

    expect(foreignUpdateError).toBeNull();
    expect(foreignUpdate).toEqual([]);

    const { data: foreignDelete, error: foreignDeleteError } = await userB.client
      .from("notes")
      .delete()
      .eq("knowledge_object_id", knowledgeObjectId)
      .select("knowledge_object_id");

    expect(foreignDeleteError).toBeNull();
    expect(foreignDelete).toEqual([]);

    const { error: foreignInsertError } = await userB.client.from("notes").insert({
      knowledge_object_id: knowledgeObjectId,
      owner_id: userA.id,
      title: "Forbidden insert",
    });

    expect(foreignInsertError).toMatchObject({ code: "42501" });
  });

  it("defaults empty bodies and enforces one daily note per owner and date", async () => {
    const firstEnvelopeId = await createNoteEnvelope(userA, "First daily note");
    const secondEnvelopeId = await createNoteEnvelope(userA, "Duplicate daily note");
    const dailyNoteDate = "2026-07-17";
    const { data: firstNote, error: firstCreateError } = await userA.client
      .from("notes")
      .insert({
        daily_note_date: dailyNoteDate,
        knowledge_object_id: firstEnvelopeId,
        owner_id: userA.id,
        title: "First daily note",
      })
      .select("body, daily_note_date")
      .single();

    expect(firstCreateError).toBeNull();
    expect(firstNote).toEqual({ body: "", daily_note_date: dailyNoteDate });

    const { error: duplicateError } = await userA.client.from("notes").insert({
      daily_note_date: dailyNoteDate,
      knowledge_object_id: secondEnvelopeId,
      owner_id: userA.id,
      title: "Duplicate daily note",
    });

    expect(duplicateError).toMatchObject({ code: "23505" });
  });

  it("moves notes to the root when their folder is physically deleted", async () => {
    const knowledgeObjectId = await createNoteEnvelope(userA, "Temporary folder note");
    const { data: folder, error: folderError } = await userA.client
      .from("folders")
      .insert({ name: "Temporary", owner_id: userA.id })
      .select("id")
      .single();

    expect(folderError).toBeNull();

    if (!folder) {
      throw new Error("Expected the owner to create a temporary folder");
    }

    const { error: noteError } = await userA.client.from("notes").insert({
      folder_id: folder.id,
      knowledge_object_id: knowledgeObjectId,
      owner_id: userA.id,
      title: "Temporary folder note",
    });

    expect(noteError).toBeNull();

    const { error: deleteError } = await userA.client.from("folders").delete().eq("id", folder.id);

    expect(deleteError).toBeNull();

    const { data: movedNote, error: readError } = await userA.client
      .from("notes")
      .select("folder_id")
      .eq("knowledge_object_id", knowledgeObjectId)
      .single();

    expect(readError).toBeNull();
    expect(movedNote).toEqual({ folder_id: null });
  });
});
