import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { NoteRepository } from "@/features/notes/note-repository";

const rpcRow = {
  body: "Repository body",
  created_at: "2026-07-23T00:00:00.000Z",
  daily_note_date: null,
  deleted_at: null,
  folder_id: "folder-id",
  id: "note-id",
  owner_id: "user-id",
  title: "Repository note",
  updated_at: "2026-07-23T00:00:00.000Z",
};

const expectedRecord = {
  body: "Repository body",
  createdAt: "2026-07-23T00:00:00.000Z",
  dailyNoteDate: null,
  deletedAt: null,
  folderId: "folder-id",
  id: "note-id",
  ownerId: "user-id",
  title: "Repository note",
  updatedAt: "2026-07-23T00:00:00.000Z",
};

function createFluentBuilder(result: { data: unknown; error: unknown }) {
  const builder = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn(),
  };

  builder.eq.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);

  return builder;
}

function createRpcRepository(result: { data: unknown; error: unknown }) {
  const builder = createFluentBuilder(result);
  const rpc = vi.fn().mockReturnValue(builder);
  const client = { rpc } as unknown as SupabaseClient;

  return { builder, repository: new NoteRepository(client), rpc };
}

function createTableRepository(result: { data: unknown; error: unknown }) {
  const builder = createFluentBuilder(result);
  const from = vi.fn().mockReturnValue(builder);
  const client = { from } as unknown as SupabaseClient;

  return { builder, from, repository: new NoteRepository(client) };
}

describe("NoteRepository", () => {
  it("creates the envelope and subtype through the transactional RPC", async () => {
    const { builder, repository, rpc } = createRpcRepository({ data: rpcRow, error: null });

    await expect(
      repository.createNote("user-id", {
        body: "Repository body",
        dailyNoteDate: null,
        folderId: "folder-id",
        title: "Repository note",
      }),
    ).resolves.toEqual(expectedRecord);

    expect(rpc).toHaveBeenCalledWith("create_note", {
      p_body: "Repository body",
      p_daily_note_date: null,
      p_folder_id: "folder-id",
      p_owner_id: "user-id",
      p_title: "Repository note",
    });
    expect(builder.single).toHaveBeenCalledOnce();
  });

  it("surfaces create failures without leaking the database error message", async () => {
    const databaseError = new Error("sensitive database detail");
    const { repository } = createRpcRepository({ data: null, error: databaseError });

    await expect(
      repository.createNote("user-id", {
        body: "",
        dailyNoteDate: null,
        folderId: null,
        title: "Repository note",
      }),
    ).rejects.toThrow("Unable to create note");
  });

  it("reads and maps the envelope with its note subtype", async () => {
    const { builder, from, repository } = createTableRepository({
      data: {
        created_at: rpcRow.created_at,
        deleted_at: null,
        id: "note-id",
        notes: {
          body: "Repository body",
          daily_note_date: null,
          folder_id: "folder-id",
        },
        owner_id: "user-id",
        title: "Repository note",
        updated_at: rpcRow.updated_at,
      },
      error: null,
    });

    await expect(repository.getNote("user-id", "note-id")).resolves.toEqual(expectedRecord);
    expect(from).toHaveBeenCalledWith("knowledge_objects");
    expect(builder.eq).toHaveBeenNthCalledWith(1, "id", "note-id");
    expect(builder.eq).toHaveBeenNthCalledWith(2, "owner_id", "user-id");
    expect(builder.eq).toHaveBeenNthCalledWith(3, "type", "note");
  });

  it("returns null when RLS or the requested id yields no note", async () => {
    const { repository } = createTableRepository({ data: null, error: null });

    await expect(repository.getNote("user-id", "missing-note-id")).resolves.toBeNull();
  });

  it("sends explicit patch-presence flags to the transactional update RPC", async () => {
    const updatedRow = {
      ...rpcRow,
      body: "Updated body",
      folder_id: null,
      updated_at: "2026-07-23T01:00:00.000Z",
    };
    const { repository, rpc } = createRpcRepository({ data: updatedRow, error: null });

    await expect(
      repository.updateNote("user-id", "note-id", {
        body: "Updated body",
        folderId: null,
      }),
    ).resolves.toEqual({
      ...expectedRecord,
      body: "Updated body",
      folderId: null,
      updatedAt: "2026-07-23T01:00:00.000Z",
    });

    expect(rpc).toHaveBeenCalledWith("update_note", {
      p_body: "Updated body",
      p_folder_id: null,
      p_knowledge_object_id: "note-id",
      p_owner_id: "user-id",
      p_title: null,
      p_update_body: true,
      p_update_folder: true,
      p_update_title: false,
    });
  });

  it("returns null when the transactional update cannot see the note", async () => {
    const { repository } = createRpcRepository({ data: null, error: null });

    await expect(
      repository.updateNote("user-id", "foreign-note-id", { title: "No access" }),
    ).resolves.toBeNull();
  });

  it("soft-deletes only the requested owned note envelope", async () => {
    const { builder, repository } = createTableRepository({
      data: { id: "note-id" },
      error: null,
    });
    const deletedAt = "2026-07-23T02:00:00.000Z";

    await expect(repository.softDeleteNote("user-id", "note-id", deletedAt)).resolves.toBe(true);
    expect(builder.update).toHaveBeenCalledWith({
      deleted_at: deletedAt,
      updated_at: deletedAt,
    });
    expect(builder.eq).toHaveBeenNthCalledWith(1, "id", "note-id");
    expect(builder.eq).toHaveBeenNthCalledWith(2, "owner_id", "user-id");
    expect(builder.eq).toHaveBeenNthCalledWith(3, "type", "note");
  });

  it("restores and returns the complete note record", async () => {
    const restoredAt = "2026-07-23T03:00:00.000Z";
    const { builder, repository } = createTableRepository({
      data: {
        created_at: rpcRow.created_at,
        deleted_at: null,
        id: "note-id",
        notes: [
          {
            body: "Repository body",
            daily_note_date: null,
            folder_id: "folder-id",
          },
        ],
        owner_id: "user-id",
        title: "Repository note",
        updated_at: restoredAt,
      },
      error: null,
    });

    await expect(repository.restoreNote("user-id", "note-id", restoredAt)).resolves.toEqual({
      ...expectedRecord,
      updatedAt: restoredAt,
    });
    expect(builder.update).toHaveBeenCalledWith({
      deleted_at: null,
      updated_at: restoredAt,
    });
  });
});
