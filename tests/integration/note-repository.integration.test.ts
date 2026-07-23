import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { NoteRepository } from "@/features/notes/note-repository";

import { createCloudIntegrationTestHarness } from "./supabase-test-harness";

describe("NoteRepository Cloud integration", () => {
  const { userA, userB } = createCloudIntegrationTestHarness();
  const repositoryA = new NoteRepository(userA.client);
  const repositoryB = new NoteRepository(userB.client);

  it("writes both note tables atomically while preserving RLS", async () => {
    const title = `Repository integration ${randomUUID()}`;
    const note = await repositoryA.createNote(userA.id, {
      body: "Initial body",
      dailyNoteDate: null,
      folderId: null,
      title,
    });

    const { data: envelope, error: envelopeError } = await userA.client
      .from("knowledge_objects")
      .select("id, owner_id, type, title, updated_at")
      .eq("id", note.id)
      .single();
    const { data: subtype, error: subtypeError } = await userA.client
      .from("notes")
      .select("knowledge_object_id, owner_id, title, body, updated_at")
      .eq("knowledge_object_id", note.id)
      .single();

    expect(envelopeError).toBeNull();
    expect(subtypeError).toBeNull();
    expect(envelope).toMatchObject({
      id: note.id,
      owner_id: userA.id,
      title,
      type: "note",
    });
    expect(subtype).toMatchObject({
      body: "Initial body",
      knowledge_object_id: note.id,
      owner_id: userA.id,
      title,
    });
    expect(subtype?.updated_at).toBe(envelope?.updated_at);

    await expect(repositoryB.getNote(userB.id, note.id)).resolves.toBeNull();
    await expect(
      repositoryB.updateNote(userB.id, note.id, { title: "Forbidden title" }),
    ).resolves.toBeNull();

    const { error: forgedOwnerError } = await userB.client.rpc("create_note", {
      p_body: "Forbidden",
      p_daily_note_date: null,
      p_folder_id: null,
      p_owner_id: userA.id,
      p_title: "Forbidden",
    });

    expect(forgedOwnerError).toMatchObject({ code: "42501" });

    const updated = await repositoryA.updateNote(userA.id, note.id, {
      body: "Updated body",
      folderId: null,
      title: "Updated title",
    });

    expect(updated).toMatchObject({
      body: "Updated body",
      id: note.id,
      title: "Updated title",
    });

    const deletedAt = new Date().toISOString();
    await expect(repositoryA.softDeleteNote(userA.id, note.id, deletedAt)).resolves.toBe(true);
    const softDeletedNote = await repositoryA.getNote(userA.id, note.id);

    expect(softDeletedNote?.deletedAt).not.toBeNull();
    expect(Date.parse(softDeletedNote?.deletedAt ?? "")).toBe(Date.parse(deletedAt));

    // NOTE-04: update_note refuses soft-deleted targets without mutating them.
    await expect(
      repositoryA.updateNote(userA.id, note.id, { title: "Trash edit" }),
    ).resolves.toBeNull();
    const trashedNote = await repositoryA.getNote(userA.id, note.id);
    expect(trashedNote?.title).toBe("Updated title");

    // NOTE-05: a repeat delete must not refresh deleted_at (would restart the
    // ADR-18 purge clock).
    await expect(
      repositoryA.softDeleteNote(userA.id, note.id, new Date().toISOString()),
    ).resolves.toBe(false);
    const unchangedTrash = await repositoryA.getNote(userA.id, note.id);
    expect(Date.parse(unchangedTrash?.deletedAt ?? "")).toBe(Date.parse(deletedAt));

    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - 30);

    await expect(
      repositoryA.restoreNote(
        userA.id,
        note.id,
        new Date().toISOString(),
        windowStart.toISOString(),
      ),
    ).resolves.toMatchObject({ deletedAt: null, id: note.id });

    // NOTE-05: restoring an active note is a NotFound-shaped null, not a no-op write.
    await expect(
      repositoryA.restoreNote(
        userA.id,
        note.id,
        new Date().toISOString(),
        windowStart.toISOString(),
      ),
    ).resolves.toBeNull();

    // NOTE-05: trash older than the retention window is not restorable.
    const expiredDeletedAt = new Date();
    expiredDeletedAt.setUTCDate(expiredDeletedAt.getUTCDate() - 31);
    const { error: backdateError } = await userA.client
      .from("knowledge_objects")
      .update({ deleted_at: expiredDeletedAt.toISOString() })
      .eq("id", note.id)
      .eq("owner_id", userA.id);
    expect(backdateError).toBeNull();

    await expect(
      repositoryA.restoreNote(
        userA.id,
        note.id,
        new Date().toISOString(),
        windowStart.toISOString(),
      ),
    ).resolves.toBeNull();

    // Cleanup: the backdated row is expired trash for the shared harness user;
    // remove it so the retention-purge suite's counts are not polluted.
    const { error: cleanupError } = await userA.client
      .from("knowledge_objects")
      .delete()
      .eq("id", note.id)
      .eq("owner_id", userA.id);
    expect(cleanupError).toBeNull();
  });

  it("rolls back the envelope when a subtype create or update fails", async () => {
    const invalidFolderId = randomUUID();
    const rejectedTitle = `Rejected create ${randomUUID()}`;

    await expect(
      repositoryA.createNote(userA.id, {
        body: "Must roll back",
        dailyNoteDate: null,
        folderId: invalidFolderId,
        title: rejectedTitle,
      }),
    ).rejects.toThrow("Unable to create note");

    const { data: rejectedEnvelopes, error: rejectedEnvelopeError } = await userA.client
      .from("knowledge_objects")
      .select("id")
      .eq("owner_id", userA.id)
      .eq("title", rejectedTitle);

    expect(rejectedEnvelopeError).toBeNull();
    expect(rejectedEnvelopes).toEqual([]);

    const note = await repositoryA.createNote(userA.id, {
      body: "Stable body",
      dailyNoteDate: null,
      folderId: null,
      title: "Stable title",
    });

    await expect(
      repositoryA.updateNote(userA.id, note.id, {
        folderId: invalidFolderId,
        title: "Must not persist",
      }),
    ).rejects.toThrow("Unable to update note");

    const { data: envelope, error: envelopeError } = await userA.client
      .from("knowledge_objects")
      .select("title")
      .eq("id", note.id)
      .single();
    const { data: subtype, error: subtypeError } = await userA.client
      .from("notes")
      .select("title, folder_id")
      .eq("knowledge_object_id", note.id)
      .single();

    expect(envelopeError).toBeNull();
    expect(subtypeError).toBeNull();
    expect(envelope).toEqual({ title: "Stable title" });
    expect(subtype).toEqual({ folder_id: null, title: "Stable title" });
  });
});
