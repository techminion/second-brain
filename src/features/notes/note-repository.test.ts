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
    gte: vi.fn(),
    is: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    not: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    // Awaiting the raw builder (the list terminal) resolves like PostgREST does.
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(result).then(resolve),
    update: vi.fn(),
  };

  builder.eq.mockReturnValue(builder);
  builder.gte.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.or.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
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

  it("lists active owned notes newest-edited first with keyset and folder filters", async () => {
    const { builder, repository } = createTableRepository({
      data: [
        {
          created_at: rpcRow.created_at,
          deleted_at: null,
          id: "note-id",
          notes: [{ body: "Repository body", daily_note_date: null, folder_id: "folder-id" }],
          owner_id: "user-id",
          title: "Repository note",
          updated_at: rpcRow.updated_at,
        },
      ],
      error: null,
    });

    await expect(
      repository.listNotes("user-id", {
        folderId: "folder-id",
        keysetBefore: {
          idBefore: "cursor-note-id",
          updatedAtBefore: "2026-07-24T05:00:00.000Z",
        },
        limit: 51,
      }),
    ).resolves.toEqual([expectedRecord]);

    expect(builder.eq).toHaveBeenCalledWith("owner_id", "user-id");
    expect(builder.eq).toHaveBeenCalledWith("type", "note");
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
    expect(builder.eq).toHaveBeenCalledWith("notes.folder_id", "folder-id");
    expect(builder.or).toHaveBeenCalledWith(
      'updated_at.lt."2026-07-24T05:00:00.000Z",and(updated_at.eq."2026-07-24T05:00:00.000Z",id.lt."cursor-note-id")',
    );
    expect(builder.order).toHaveBeenNthCalledWith(1, "updated_at", { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(51);
  });

  it("filters to root notes when folderId is explicitly null", async () => {
    const { builder, repository } = createTableRepository({ data: [], error: null });

    await expect(repository.listNotes("user-id", { folderId: null, limit: 51 })).resolves.toEqual(
      [],
    );

    expect(builder.is).toHaveBeenCalledWith("notes.folder_id", null);
    expect(builder.or).not.toHaveBeenCalled();
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
    expect(builder.is).toHaveBeenCalledWith("deleted_at", null);
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

    const windowStart = "2026-06-23T03:00:00.000Z";

    await expect(
      repository.restoreNote("user-id", "note-id", restoredAt, windowStart),
    ).resolves.toEqual({
      ...expectedRecord,
      updatedAt: restoredAt,
    });
    expect(builder.update).toHaveBeenCalledWith({
      deleted_at: null,
      updated_at: restoredAt,
    });
    expect(builder.not).toHaveBeenCalledWith("deleted_at", "is", null);
    expect(builder.gte).toHaveBeenCalledWith("deleted_at", windowStart);
  });
});
