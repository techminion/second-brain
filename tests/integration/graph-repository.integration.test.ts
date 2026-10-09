import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { GraphRepository } from "@/features/graph/graph-repository";
import { NoteRepository } from "@/features/notes/note-repository";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

// UX-11: graph nodes carry folderId and tagIds (the API is additive), and RLS
// still scopes them to the owner.
describe("GraphRepository Cloud integration (UX-11)", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();

  it("returns folderId and tagIds on the owner's nodes, and nothing to another user", async () => {
    const { data: folder, error: folderError } = await userA.client
      .from("folders")
      .insert({ name: `Graph ${randomUUID()}`, owner_id: userA.id })
      .select("id")
      .single();
    expect(folderError).toBeNull();
    const { data: tag, error: tagError } = await userA.client
      .from("tags")
      .insert({ name: `graph-${randomUUID()}`, owner_id: userA.id })
      .select("id")
      .single();
    expect(tagError).toBeNull();
    if (!folder || !tag) {
      throw new Error("Expected the owner to create a folder and a tag");
    }

    const note = await new NoteRepository(userA.client).createNote(userA.id, {
      body: "",
      dailyNoteDate: null,
      folderId: folder.id,
      title: `Graph node ${randomUUID()}`,
    });
    const { error: associationError } = await userA.client
      .from("knowledge_object_tags")
      .insert({ knowledge_object_id: note.id, owner_id: userA.id, tag_id: tag.id });
    expect(associationError).toBeNull();

    const nodes = await new GraphRepository(userA.client).listNodes(userA.id);
    expect(nodes.find((node) => node.id === note.id)).toMatchObject({
      folderId: folder.id,
      tagIds: [tag.id],
    });

    const foreign = await new GraphRepository(userB.client).listNodes(userA.id);
    expect(foreign.find((node) => node.id === note.id)).toBeUndefined();
  });
});
