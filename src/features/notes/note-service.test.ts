import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { dailyNoteTemplate, NoteService } from "@/features/notes/note-service";
import type {
  BacklinkRecord,
  CreateNoteInput,
  CreateNoteRecordInput,
  ListNotesRecordOptions,
  ListTrashedNotesRecordOptions,
  NoteRecord,
  UpdateNoteInput,
  UpdateNoteRecordInput,
} from "@/features/notes/types";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";

interface MockNoteRepository {
  attachTag: Mock<(userId: string, objectId: string, tagId: string) => Promise<void>>;
  detachTag: Mock<(userId: string, objectId: string, tagId: string) => Promise<void>>;
  findOrCreateTag: Mock<(userId: string, name: string) => Promise<{ id: string; name: string }>>;
  listBacklinks: Mock<(userId: string, targetId: string) => Promise<BacklinkRecord[]>>;
  getTagsForObjects: Mock<
    (userId: string, ids: string[]) => Promise<Map<string, { id: string; name: string }[]>>
  >;
  createDailyNote: Mock<
    (userId: string, input: CreateNoteRecordInput) => Promise<NoteRecord | null>
  >;
  getDailyNote: Mock<(userId: string, date: string) => Promise<NoteRecord | null>>;
  createNote: Mock<(userId: string, input: CreateNoteRecordInput) => Promise<NoteRecord>>;
  getNote: Mock<(userId: string, noteId: string) => Promise<NoteRecord | null>>;
  listNotes: Mock<(userId: string, options: ListNotesRecordOptions) => Promise<NoteRecord[]>>;
  listTrashedNotes: Mock<
    (userId: string, options: ListTrashedNotesRecordOptions) => Promise<NoteRecord[]>
  >;
  restoreNote: Mock<
    (
      userId: string,
      noteId: string,
      restoredAt: string,
      windowStart: string,
    ) => Promise<NoteRecord | null>
  >;
  softDeleteNote: Mock<(userId: string, noteId: string, deletedAt: string) => Promise<boolean>>;
  updateNote: Mock<
    (userId: string, noteId: string, input: UpdateNoteRecordInput) => Promise<NoteRecord | null>
  >;
}

const noteRecord: NoteRecord = {
  body: "Service body",
  createdAt: "2026-07-23T05:00:00.000Z",
  dailyNoteDate: null,
  deletedAt: null,
  folderId: "folder-id",
  id: "99999999-9999-4999-8999-999999999999",
  ownerId: "user-id",
  title: "Service note",
  updatedAt: "2026-07-23T05:00:00.000Z",
};

function createRepositoryMock(): MockNoteRepository {
  return {
    attachTag: vi.fn().mockResolvedValue(undefined),
    detachTag: vi.fn().mockResolvedValue(undefined),
    findOrCreateTag: vi.fn(),
    getTagsForObjects: vi.fn().mockResolvedValue(new Map()),
    listBacklinks: vi.fn().mockResolvedValue([]),
    createDailyNote: vi.fn(),
    getDailyNote: vi.fn(),
    createNote: vi.fn(),
    getNote: vi.fn(),
    listNotes: vi.fn(),
    listTrashedNotes: vi.fn(),
    restoreNote: vi.fn(),
    softDeleteNote: vi.fn(),
    updateNote: vi.fn(),
  };
}

describe("NoteService.create", () => {
  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    repository = createRepositoryMock();
    repository.createNote.mockResolvedValue(noteRecord);
    service = new NoteService(repository);
  });

  it("creates a note through the transactional repository contract", async () => {
    await expect(
      service.create("user-id", {
        body: "Service body",
        folderId: "folder-id",
        title: "Service note",
      }),
    ).resolves.toEqual({
      body: "Service body",
      createdAt: noteRecord.createdAt,
      dailyNoteDate: null,
      folderId: "folder-id",
      id: "99999999-9999-4999-8999-999999999999",
      tags: [],
      title: "Service note",
      type: "note",
      updatedAt: noteRecord.updatedAt,
    });

    expect(repository.createNote).toHaveBeenCalledWith("user-id", {
      body: "Service body",
      dailyNoteDate: null,
      folderId: "folder-id",
      linkTitles: [],
      title: "Service note",
    });
  });

  it("defaults an omitted body and folder to an empty root note", async () => {
    repository.createNote.mockResolvedValue({
      ...noteRecord,
      body: "",
      folderId: null,
    });

    await service.create("user-id", { title: "Root note" });

    expect(repository.createNote).toHaveBeenCalledWith("user-id", {
      body: "",
      dailyNoteDate: null,
      folderId: null,
      linkTitles: [],
      title: "Root note",
    });
  });

  it("rejects an empty title before data access", async () => {
    await expect(service.create("user-id", { title: "" })).rejects.toEqual(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        message: "Title must not be empty",
        statusCode: 400,
      }),
    );

    expect(repository.createNote).not.toHaveBeenCalled();
  });

  it.each([
    ["title", { title: null }],
    ["body", { body: null, title: "Note" }],
    ["folder id", { folderId: null, title: "Note" }],
  ])("rejects a non-string %s before data access", async (_field, invalidInput) => {
    await expect(
      service.create("user-id", invalidInput as unknown as CreateNoteInput),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(repository.createNote).not.toHaveBeenCalled();
  });
});

describe("NoteService.get", () => {
  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new NoteService(repository);
  });

  it("returns a visible note through the RLS-scoped repository", async () => {
    repository.getNote.mockResolvedValue(noteRecord);

    await expect(service.get("user-id", "99999999-9999-4999-8999-999999999999")).resolves.toEqual({
      body: "Service body",
      createdAt: noteRecord.createdAt,
      dailyNoteDate: null,
      folderId: "folder-id",
      id: "99999999-9999-4999-8999-999999999999",
      tags: [],
      title: "Service note",
      type: "note",
      updatedAt: noteRecord.updatedAt,
    });

    expect(repository.getNote).toHaveBeenCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
    );
  });

  it("returns NotFoundError when RLS or the requested id yields no note", async () => {
    repository.getNote.mockResolvedValue(null);

    await expect(service.get("user-id", "inaccessible-note-id")).rejects.toEqual(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: "Note not found",
        statusCode: 404,
      }),
    );
  });

  it("hides soft-deleted notes outside the trash flow", async () => {
    repository.getNote.mockResolvedValue({
      ...noteRecord,
      deletedAt: "2026-07-23T06:00:00.000Z",
    });

    await expect(
      service.get("user-id", "99999999-9999-4999-8999-999999999999"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("NoteService.update", () => {
  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    repository = createRepositoryMock();
    repository.updateNote.mockResolvedValue(noteRecord);
    service = new NoteService(repository);
  });

  it("updates a note through the transactional repository contract", async () => {
    repository.updateNote.mockResolvedValue({
      ...noteRecord,
      body: "Updated body",
      title: "Updated title",
    });

    await expect(
      service.update("user-id", "99999999-9999-4999-8999-999999999999", {
        body: "Updated body",
        title: "Updated title",
      }),
    ).resolves.toEqual({
      body: "Updated body",
      createdAt: noteRecord.createdAt,
      dailyNoteDate: null,
      folderId: "folder-id",
      id: "99999999-9999-4999-8999-999999999999",
      tags: [],
      title: "Updated title",
      type: "note",
      updatedAt: noteRecord.updatedAt,
    });

    expect(repository.updateNote).toHaveBeenCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
      {
        body: "Updated body",
        folderId: undefined,
        linkTitles: [],
        title: "Updated title",
      },
    );
  });

  it("passes an explicit null folder through to move the note to root", async () => {
    repository.updateNote.mockResolvedValue({ ...noteRecord, folderId: null });

    await service.update("user-id", "99999999-9999-4999-8999-999999999999", { folderId: null });

    expect(repository.updateNote).toHaveBeenCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
      {
        body: undefined,
        folderId: null,
        title: undefined,
      },
    );
  });

  it("leaves omitted fields undefined so the repository does not touch them", async () => {
    await service.update("user-id", "99999999-9999-4999-8999-999999999999", {
      title: "Only the title",
    });

    expect(repository.updateNote).toHaveBeenCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
      {
        body: undefined,
        folderId: undefined,
        title: "Only the title",
      },
    );
  });

  it("rejects an empty title before data access", async () => {
    await expect(
      service.update("user-id", "99999999-9999-4999-8999-999999999999", { title: "" }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        message: "Title must not be empty",
        statusCode: 400,
      }),
    );

    expect(repository.updateNote).not.toHaveBeenCalled();
  });

  it.each([
    ["title", { title: 7 }],
    ["body", { body: 7 }],
    ["folder id", { folderId: 7 }],
  ])("rejects a non-string %s before data access", async (_field, invalidInput) => {
    await expect(
      service.update(
        "user-id",
        "99999999-9999-4999-8999-999999999999",
        invalidInput as unknown as UpdateNoteInput,
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(repository.updateNote).not.toHaveBeenCalled();
  });

  it("returns NotFoundError when the target is nonexistent, foreign-owned, or soft-deleted", async () => {
    repository.updateNote.mockResolvedValue(null);

    await expect(
      service.update("user-id", "99999999-9999-4999-8999-999999999999", { title: "New" }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: "Note not found",
        statusCode: 404,
      }),
    );
  });

  it("defensively rejects a record that still carries deletedAt", async () => {
    repository.updateNote.mockResolvedValue({
      ...noteRecord,
      deletedAt: "2026-07-23T06:00:00.000Z",
    });

    await expect(
      service.update("user-id", "99999999-9999-4999-8999-999999999999", { title: "New" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("NoteService.delete", () => {
  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
    repository = createRepositoryMock();
    service = new NoteService(repository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("soft-deletes through the repository with the current timestamp", async () => {
    repository.softDeleteNote.mockResolvedValue(true);

    await expect(
      service.delete("user-id", "99999999-9999-4999-8999-999999999999"),
    ).resolves.toBeUndefined();

    expect(repository.softDeleteNote).toHaveBeenCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
      "2026-07-24T12:00:00.000Z",
    );
  });

  it("returns NotFoundError when the target is nonexistent, foreign-owned, or already deleted", async () => {
    repository.softDeleteNote.mockResolvedValue(false);

    await expect(service.delete("user-id", "99999999-9999-4999-8999-999999999999")).rejects.toEqual(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: "Note not found",
        statusCode: 404,
      }),
    );
  });
});

describe("NoteService.restore", () => {
  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T12:00:00.000Z"));
    repository = createRepositoryMock();
    service = new NoteService(repository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores a trashed note within the 30-day retention window", async () => {
    repository.restoreNote.mockResolvedValue(noteRecord);

    await expect(
      service.restore("user-id", "99999999-9999-4999-8999-999999999999"),
    ).resolves.toEqual({
      body: "Service body",
      createdAt: noteRecord.createdAt,
      dailyNoteDate: null,
      folderId: "folder-id",
      id: "99999999-9999-4999-8999-999999999999",
      tags: [],
      title: "Service note",
      type: "note",
      updatedAt: noteRecord.updatedAt,
    });

    expect(repository.restoreNote).toHaveBeenCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
      "2026-07-24T12:00:00.000Z",
      "2026-06-24T12:00:00.000Z",
    );
  });

  it("returns NotFoundError for active notes and trash outside the retention window", async () => {
    repository.restoreNote.mockResolvedValue(null);

    await expect(
      service.restore("user-id", "99999999-9999-4999-8999-999999999999"),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: "Note not found",
        statusCode: 404,
      }),
    );
  });
});

describe("NoteService.list", () => {
  const recordId = "3f9f9a68-0000-4000-8000-000000000001";
  const listRecord: NoteRecord = {
    ...noteRecord,
    id: recordId,
    updatedAt: "2026-07-24T08:00:00.000Z",
  };

  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    repository = createRepositoryMock();
    repository.listNotes.mockResolvedValue([]);
    service = new NoteService(repository);
  });

  it("lists notes with the default page size, requesting one extra row to detect a next page", async () => {
    repository.listNotes.mockResolvedValue([listRecord]);

    await expect(service.list("user-id")).resolves.toEqual({
      items: [
        {
          body: "Service body",
          createdAt: listRecord.createdAt,
          dailyNoteDate: null,
          folderId: "folder-id",
          id: recordId,
          tags: [],
          title: "Service note",
          type: "note",
          updatedAt: listRecord.updatedAt,
        },
      ],
    });

    expect(repository.listNotes).toHaveBeenCalledWith("user-id", {
      folderId: undefined,
      keysetBefore: undefined,
      limit: 51,
    });
  });

  it("returns a nextCursor encoding the last returned row when an extra row comes back", async () => {
    const second: NoteRecord = {
      ...listRecord,
      id: "3f9f9a68-0000-4000-8000-000000000002",
      updatedAt: "2026-07-24T07:00:00.000Z",
    };
    const third: NoteRecord = {
      ...listRecord,
      id: "3f9f9a68-0000-4000-8000-000000000003",
      updatedAt: "2026-07-24T06:00:00.000Z",
    };
    repository.listNotes.mockResolvedValue([listRecord, second, third]);

    const page = await service.list("user-id", { limit: 2 });

    expect(page.items.map((note) => note.id)).toEqual([listRecord.id, second.id]);
    expect(page.nextCursor).toBeDefined();

    const decoded = JSON.parse(Buffer.from(page.nextCursor ?? "", "base64url").toString("utf8"));
    expect(decoded).toEqual({ i: second.id, u: second.updatedAt });
  });

  it("resumes from a cursor by passing the decoded keyset to the repository", async () => {
    const cursor = Buffer.from(
      JSON.stringify({ i: recordId, u: "2026-07-24T08:00:00.000Z" }),
    ).toString("base64url");

    await service.list("user-id", { cursor, limit: 10 });

    expect(repository.listNotes).toHaveBeenCalledWith("user-id", {
      folderId: undefined,
      keysetBefore: { idBefore: recordId, updatedAtBefore: "2026-07-24T08:00:00.000Z" },
      limit: 11,
    });
  });

  it("ignores malformed and non-conforming cursors instead of throwing", async () => {
    const forged = Buffer.from(
      JSON.stringify({ i: "not-a-uuid", u: 'evil",or(id.not.is.null' }),
    ).toString("base64url");

    for (const cursor of ["%%%not-base64", forged]) {
      await service.list("user-id", { cursor });

      expect(repository.listNotes).toHaveBeenLastCalledWith("user-id", {
        folderId: undefined,
        keysetBefore: undefined,
        limit: 51,
      });
    }
  });

  it("clamps out-of-range limits into the documented 1–100 window", async () => {
    await service.list("user-id", { limit: 1000 });
    expect(repository.listNotes).toHaveBeenLastCalledWith(
      "user-id",
      expect.objectContaining({ limit: 101 }),
    );

    await service.list("user-id", { limit: -5 });
    expect(repository.listNotes).toHaveBeenLastCalledWith(
      "user-id",
      expect.objectContaining({ limit: 2 }),
    );

    await service.list("user-id", { limit: Number.NaN });
    expect(repository.listNotes).toHaveBeenLastCalledWith(
      "user-id",
      expect.objectContaining({ limit: 51 }),
    );
  });

  it("passes the folder filter through, including the explicit-null root filter", async () => {
    await service.list("user-id", { folderId: "folder-id" });
    expect(repository.listNotes).toHaveBeenLastCalledWith(
      "user-id",
      expect.objectContaining({ folderId: "folder-id" }),
    );

    await service.list("user-id", { folderId: null });
    expect(repository.listNotes).toHaveBeenLastCalledWith(
      "user-id",
      expect.objectContaining({ folderId: null }),
    );
  });
});

describe("NoteService.listTrash", () => {
  let repository: MockNoteRepository;
  let service: NoteService;

  const trashed = (id: string, deletedAt: string): NoteRecord => ({
    ...noteRecord,
    deletedAt,
    id,
    updatedAt: deletedAt,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T12:00:00.000Z"));
    repository = createRepositoryMock();
    service = new NoteService(repository);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns restorable trash with deletedAt, bounded by the 30-day window", async () => {
    repository.listTrashedNotes.mockResolvedValue([
      trashed("11111111-1111-4111-8111-111111111111", "2026-08-30T00:00:00.000Z"),
    ]);

    await expect(service.listTrash("user-id")).resolves.toEqual({
      items: [
        expect.objectContaining({
          deletedAt: "2026-08-30T00:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
          type: "note",
        }),
      ],
    });
    expect(repository.listTrashedNotes).toHaveBeenCalledWith("user-id", {
      keysetBefore: undefined,
      limit: 51,
      windowStart: "2026-08-01T12:00:00.000Z",
    });
  });

  it("pages by (deleted_at, id) with an opaque cursor that round-trips", async () => {
    const first = trashed("22222222-2222-4222-8222-222222222222", "2026-08-30T00:00:00.000Z");
    const second = trashed("11111111-1111-4111-8111-111111111111", "2026-08-29T00:00:00.000Z");
    repository.listTrashedNotes.mockResolvedValueOnce([first, second]);

    const page = await service.listTrash("user-id", { limit: 1 });

    expect(page.items.map((note) => note.id)).toEqual([first.id]);
    expect(page.nextCursor).toEqual(expect.any(String));

    repository.listTrashedNotes.mockResolvedValueOnce([second]);
    await service.listTrash("user-id", { cursor: page.nextCursor, limit: 1 });

    expect(repository.listTrashedNotes).toHaveBeenLastCalledWith(
      "user-id",
      expect.objectContaining({
        keysetBefore: { deletedAtBefore: first.deletedAt, idBefore: first.id },
      }),
    );
  });

  it("treats a forged cursor as absent and clamps the limit", async () => {
    repository.listTrashedNotes.mockResolvedValue([]);
    const forged = Buffer.from(JSON.stringify({ i: "x),or(1.eq.1", u: "now" })).toString(
      "base64url",
    );

    await service.listTrash("user-id", { cursor: forged, limit: 1000 });

    expect(repository.listTrashedNotes).toHaveBeenCalledWith(
      "user-id",
      expect.objectContaining({ keysetBefore: undefined, limit: 101 }),
    );
  });

  it("never surfaces a row the repository returned without a deletion marker", async () => {
    repository.listTrashedNotes.mockResolvedValue([noteRecord]);

    await expect(service.listTrash("user-id")).resolves.toEqual({ items: [] });
  });
});

describe("NoteService.getOrCreateDailyNote", () => {
  let repository: MockNoteRepository;
  let service: NoteService;

  const daily: NoteRecord = {
    ...noteRecord,
    body: dailyNoteTemplate,
    dailyNoteDate: "2026-09-27",
    folderId: null,
    title: "2026-09-27",
  };

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new NoteService(repository);
  });

  it("returns the existing active daily note without writing", async () => {
    repository.getDailyNote.mockResolvedValue(daily);

    await expect(service.getOrCreateDailyNote("user-id", "2026-09-27")).resolves.toEqual(
      expect.objectContaining({
        dailyNoteDate: "2026-09-27",
        id: "99999999-9999-4999-8999-999999999999",
      }),
    );
    expect(repository.getDailyNote).toHaveBeenCalledWith("user-id", "2026-09-27");
    expect(repository.createDailyNote).not.toHaveBeenCalled();
    expect(repository.restoreNote).not.toHaveBeenCalled();
  });

  it("creates the note with the ISO date title and the fixed template", async () => {
    repository.getDailyNote.mockResolvedValue(null);
    repository.createDailyNote.mockResolvedValue(daily);

    await service.getOrCreateDailyNote("user-id", "2026-09-27");

    expect(repository.createDailyNote).toHaveBeenCalledWith("user-id", {
      body: "## Notes\n\n\n## Tasks\n\n- [ ] ",
      dailyNoteDate: "2026-09-27",
      folderId: null,
      title: "2026-09-27",
    });
  });

  it("re-reads the winner when a concurrent create takes the date first", async () => {
    repository.getDailyNote.mockResolvedValueOnce(null).mockResolvedValueOnce(daily);
    repository.createDailyNote.mockResolvedValue(null);

    await expect(service.getOrCreateDailyNote("user-id", "2026-09-27")).resolves.toEqual(
      expect.objectContaining({ id: "99999999-9999-4999-8999-999999999999" }),
    );
    expect(repository.getDailyNote).toHaveBeenCalledTimes(2);
  });

  it("auto-restores a trashed daily note regardless of the retention window", async () => {
    repository.getDailyNote.mockResolvedValue({ ...daily, deletedAt: "2026-01-01T00:00:00.000Z" });
    repository.restoreNote.mockResolvedValue(daily);

    await expect(service.getOrCreateDailyNote("user-id", "2026-09-27")).resolves.toEqual(
      expect.objectContaining({ id: "99999999-9999-4999-8999-999999999999" }),
    );
    expect(repository.restoreNote).toHaveBeenCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
      expect.any(String),
      "1970-01-01T00:00:00.000Z",
    );
    expect(repository.createDailyNote).not.toHaveBeenCalled();
  });

  it.each(["2026-02-30", "27/09/2026", "", "2026-09-27T00:00:00Z"])(
    "rejects %j before touching data",
    async (date) => {
      await expect(service.getOrCreateDailyNote("user-id", date)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(repository.getDailyNote).not.toHaveBeenCalled();
    },
  );
});

describe("NoteService tagging (TAG-01)", () => {
  const noteId = "11111111-1111-4111-8111-111111111111";
  const tagId = "22222222-2222-4222-8222-222222222222";
  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    repository = createRepositoryMock();
    repository.getNote.mockResolvedValue({
      ...noteRecord,
      id: noteId,
      tags: [{ id: tagId, name: "Research" }],
    });
    repository.findOrCreateTag.mockResolvedValue({ id: tagId, name: "Research" });
    service = new NoteService(repository);
  });

  it("creates-or-reuses the tag by normalized name and attaches it", async () => {
    await expect(service.addTag("user-id", noteId, "  #research ")).resolves.toEqual(
      expect.objectContaining({ tags: [{ id: tagId, name: "Research" }] }),
    );
    expect(repository.findOrCreateTag).toHaveBeenCalledWith("user-id", "research");
    expect(repository.attachTag).toHaveBeenCalledWith("user-id", noteId, tagId);
  });

  it.each(["", "   ", "#", "x".repeat(65)])("rejects tag name %j", async (name) => {
    await expect(service.addTag("user-id", noteId, name)).rejects.toBeInstanceOf(ValidationError);
    expect(repository.findOrCreateTag).not.toHaveBeenCalled();
  });

  it("refuses to tag a missing or trashed note", async () => {
    repository.getNote.mockResolvedValue({ ...noteRecord, deletedAt: "2026-09-01T00:00:00Z" });

    await expect(service.addTag("user-id", noteId, "x")).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.attachTag).not.toHaveBeenCalled();
  });

  it("detaches a tag and returns the note; a malformed tag id is a no-op", async () => {
    await service.removeTag("user-id", noteId, tagId);
    expect(repository.detachTag).toHaveBeenCalledWith("user-id", noteId, tagId);

    repository.detachTag.mockClear();
    await service.removeTag("user-id", noteId, "not-a-uuid");
    expect(repository.detachTag).not.toHaveBeenCalled();
  });

  it("returns the note's tags from update (the RPC result carries none)", async () => {
    repository.updateNote.mockResolvedValue({ ...noteRecord, id: noteId });
    repository.getTagsForObjects.mockResolvedValue(
      new Map([[noteId, [{ id: tagId, name: "Research" }]]]),
    );

    await expect(service.update("user-id", noteId, { body: "b" })).resolves.toEqual(
      expect.objectContaining({ tags: [{ id: tagId, name: "Research" }] }),
    );
  });
});

describe("NoteService wiki links (LINK-02/04, BACK-01)", () => {
  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new NoteService(repository as never);
  });

  it("passes the body's parsed link titles to create", async () => {
    repository.createNote.mockResolvedValue(noteRecord);

    await service.create("user-id", { body: "See [[Alpha]], `[[code]]`, [[alpha]]", title: "T" });

    expect(repository.createNote).toHaveBeenCalledWith(
      "user-id",
      expect.objectContaining({ linkTitles: ["Alpha"] }),
    );
  });

  it("re-derives link titles only when the body is updated", async () => {
    repository.updateNote.mockResolvedValue(noteRecord);

    await service.update("user-id", "99999999-9999-4999-8999-999999999999", {
      body: "[[B]] and [[C]]",
    });
    expect(repository.updateNote).toHaveBeenLastCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
      expect.objectContaining({ linkTitles: ["B", "C"] }),
    );

    await service.update("user-id", "99999999-9999-4999-8999-999999999999", { title: "Renamed" });
    expect(repository.updateNote).toHaveBeenLastCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
      expect.objectContaining({ linkTitles: undefined, title: "Renamed" }),
    );
  });

  it("returns backlinks with context snippets around the link", async () => {
    repository.getNote.mockResolvedValue({ ...noteRecord, title: "Target" });
    repository.listBacklinks.mockResolvedValue([
      {
        body: "Intro text then [[target]] and more.",
        summary: { id: "s1", title: "Source" } as BacklinkRecord["summary"],
      },
      {
        body: "Mentions [[Other]] only",
        summary: { id: "s2", title: "Stale" } as BacklinkRecord["summary"],
      },
    ]);

    await expect(
      service.getBacklinks("user-id", "99999999-9999-4999-8999-999999999999"),
    ).resolves.toEqual([
      { object: { id: "s1", title: "Source" }, snippet: "Intro text then [[target]] and more." },
      { object: { id: "s2", title: "Stale" }, snippet: "Mentions [[Other]] only" },
    ]);
    expect(repository.listBacklinks).toHaveBeenCalledWith(
      "user-id",
      "99999999-9999-4999-8999-999999999999",
    );
  });

  it("404s backlinks of a missing or trashed note", async () => {
    repository.getNote.mockResolvedValue(null);

    await expect(
      service.getBacklinks("user-id", "99999999-9999-4999-8999-999999999999"),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.listBacklinks).not.toHaveBeenCalled();
  });
});

describe("NoteService malformed ids (ADR-26)", () => {
  it.each(["graph", "", "not-a-uuid", "99999999-9999-4999-8999-99999999999"])(
    "maps %j to NotFoundError without touching data",
    async (badId) => {
      const repository = createRepositoryMock();
      const service = new NoteService(repository as never);

      await expect(service.get("user-id", badId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.update("user-id", badId, { body: "x" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(service.delete("user-id", badId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.restore("user-id", badId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.getBacklinks("user-id", badId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.addTag("user-id", badId, "tag")).rejects.toBeInstanceOf(NotFoundError);

      expect(repository.getNote).not.toHaveBeenCalled();
      expect(repository.updateNote).not.toHaveBeenCalled();
      expect(repository.softDeleteNote).not.toHaveBeenCalled();
      expect(repository.restoreNote).not.toHaveBeenCalled();
    },
  );

  it("still reports invalid input before an invalid id on update", async () => {
    const service = new NoteService(createRepositoryMock() as never);

    await expect(service.update("user-id", "bad", { title: "" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

// NOTE-14: the 05_API §4 contract table, row by row — every declared error is
// raised for its documented cause (and before any data access where the input
// alone decides it), methods that declare no errors never raise one for odd
// input, and infrastructure failures are never disguised as domain errors.
describe("NoteService §4 contract — declared errors (NOTE-14)", () => {
  const noteId = "33333333-3333-4333-8333-333333333333";
  let repository: MockNoteRepository;
  let service: NoteService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new NoteService(repository);
  });

  const invalidCreates: [string, unknown][] = [
    ["a non-string title", { title: 42 }],
    ["an empty title", { title: "" }],
    ["a non-string body", { body: 7, title: "T" }],
    ["a non-string folderId", { folderId: 9, title: "T" }],
  ];

  it.each(invalidCreates)(
    "create: ValidationError for %s, before data access",
    async (_, input) => {
      await expect(service.create("user-id", input as CreateNoteInput)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(repository.createNote).not.toHaveBeenCalled();
    },
  );

  const invalidUpdates: [string, unknown][] = [
    ["a non-string title", { title: 1 }],
    ["an empty title", { title: "" }],
    ["a non-string body", { body: false }],
    ["a folderId that is neither string nor null", { folderId: 3 }],
  ];

  it.each(invalidUpdates)(
    "update: ValidationError for %s, before data access",
    async (_, input) => {
      await expect(
        service.update("user-id", noteId, input as UpdateNoteInput),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(repository.updateNote).not.toHaveBeenCalled();
    },
  );

  it("get / update / delete / restore / getBacklinks: NotFoundError when the data layer finds nothing", async () => {
    repository.getNote.mockResolvedValue(null);
    repository.updateNote.mockResolvedValue(null);
    repository.softDeleteNote.mockResolvedValue(false);
    repository.restoreNote.mockResolvedValue(null);

    await expect(service.get("user-id", noteId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.update("user-id", noteId, { body: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(service.delete("user-id", noteId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.restore("user-id", noteId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getBacklinks("user-id", noteId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("addTag / removeTag: NotFoundError for a missing note, without touching tags", async () => {
    repository.getNote.mockResolvedValue(null);

    await expect(service.addTag("user-id", noteId, "research")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      service.removeTag("user-id", noteId, "22222222-2222-4222-8222-222222222222"),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.findOrCreateTag).not.toHaveBeenCalled();
    expect(repository.attachTag).not.toHaveBeenCalled();
    expect(repository.detachTag).not.toHaveBeenCalled();
  });

  it.each(["2026-02-30", "2026-13-01", "26-01-01", "2026-1-1", "today", ""])(
    "getOrCreateDailyNote: ValidationError for date %j, before data access",
    async (date) => {
      await expect(service.getOrCreateDailyNote("user-id", date)).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(repository.getDailyNote).not.toHaveBeenCalled();
      expect(repository.createDailyNote).not.toHaveBeenCalled();
    },
  );

  it("list / listTrash: declare no errors — odd options are normalized, never rejected", async () => {
    repository.listNotes.mockResolvedValue([]);
    repository.listTrashedNotes.mockResolvedValue([]);

    for (const options of [{ limit: -5 }, { limit: 10_000 }, { cursor: "%%%" }, {}]) {
      await expect(service.list("user-id", options)).resolves.toEqual({ items: [] });
      await expect(service.listTrash("user-id", options)).resolves.toEqual({ items: [] });
    }
  });

  it("never disguises an infrastructure failure as a domain error", async () => {
    const outage = new Error("Unable to read note");
    repository.getNote.mockRejectedValue(outage);
    repository.updateNote.mockRejectedValue(outage);
    repository.softDeleteNote.mockRejectedValue(outage);

    for (const call of [
      () => service.get("user-id", noteId),
      () => service.update("user-id", noteId, { body: "x" }),
      () => service.delete("user-id", noteId),
    ]) {
      const error = await call().catch((caught: unknown) => caught);
      expect(error).toBe(outage);
      expect(error).not.toBeInstanceOf(NotFoundError);
      expect(error).not.toBeInstanceOf(ValidationError);
    }
  });
});
