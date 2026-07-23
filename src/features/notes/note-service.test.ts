import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { NoteService } from "@/features/notes/note-service";
import type {
  CreateNoteInput,
  CreateNoteRecordInput,
  NoteRecord,
  UpdateNoteInput,
  UpdateNoteRecordInput,
} from "@/features/notes/types";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";

interface MockNoteRepository {
  createNote: Mock<(userId: string, input: CreateNoteRecordInput) => Promise<NoteRecord>>;
  getNote: Mock<(userId: string, noteId: string) => Promise<NoteRecord | null>>;
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
  id: "note-id",
  ownerId: "user-id",
  title: "Service note",
  updatedAt: "2026-07-23T05:00:00.000Z",
};

function createRepositoryMock(): MockNoteRepository {
  return {
    createNote: vi.fn(),
    getNote: vi.fn(),
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
      id: "note-id",
      tags: [],
      title: "Service note",
      type: "note",
      updatedAt: noteRecord.updatedAt,
    });

    expect(repository.createNote).toHaveBeenCalledWith("user-id", {
      body: "Service body",
      dailyNoteDate: null,
      folderId: "folder-id",
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

    await expect(service.get("user-id", "note-id")).resolves.toEqual({
      body: "Service body",
      createdAt: noteRecord.createdAt,
      dailyNoteDate: null,
      folderId: "folder-id",
      id: "note-id",
      tags: [],
      title: "Service note",
      type: "note",
      updatedAt: noteRecord.updatedAt,
    });

    expect(repository.getNote).toHaveBeenCalledWith("user-id", "note-id");
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

    await expect(service.get("user-id", "note-id")).rejects.toBeInstanceOf(NotFoundError);
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
      service.update("user-id", "note-id", { body: "Updated body", title: "Updated title" }),
    ).resolves.toEqual({
      body: "Updated body",
      createdAt: noteRecord.createdAt,
      dailyNoteDate: null,
      folderId: "folder-id",
      id: "note-id",
      tags: [],
      title: "Updated title",
      type: "note",
      updatedAt: noteRecord.updatedAt,
    });

    expect(repository.updateNote).toHaveBeenCalledWith("user-id", "note-id", {
      body: "Updated body",
      folderId: undefined,
      title: "Updated title",
    });
  });

  it("passes an explicit null folder through to move the note to root", async () => {
    repository.updateNote.mockResolvedValue({ ...noteRecord, folderId: null });

    await service.update("user-id", "note-id", { folderId: null });

    expect(repository.updateNote).toHaveBeenCalledWith("user-id", "note-id", {
      body: undefined,
      folderId: null,
      title: undefined,
    });
  });

  it("leaves omitted fields undefined so the repository does not touch them", async () => {
    await service.update("user-id", "note-id", { title: "Only the title" });

    expect(repository.updateNote).toHaveBeenCalledWith("user-id", "note-id", {
      body: undefined,
      folderId: undefined,
      title: "Only the title",
    });
  });

  it("rejects an empty title before data access", async () => {
    await expect(service.update("user-id", "note-id", { title: "" })).rejects.toEqual(
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
      service.update("user-id", "note-id", invalidInput as unknown as UpdateNoteInput),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(repository.updateNote).not.toHaveBeenCalled();
  });

  it("returns NotFoundError when the target is nonexistent, foreign-owned, or soft-deleted", async () => {
    repository.updateNote.mockResolvedValue(null);

    await expect(service.update("user-id", "note-id", { title: "New" })).rejects.toEqual(
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

    await expect(service.update("user-id", "note-id", { title: "New" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
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

    await expect(service.delete("user-id", "note-id")).resolves.toBeUndefined();

    expect(repository.softDeleteNote).toHaveBeenCalledWith(
      "user-id",
      "note-id",
      "2026-07-24T12:00:00.000Z",
    );
  });

  it("returns NotFoundError when the target is nonexistent, foreign-owned, or already deleted", async () => {
    repository.softDeleteNote.mockResolvedValue(false);

    await expect(service.delete("user-id", "note-id")).rejects.toEqual(
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

    await expect(service.restore("user-id", "note-id")).resolves.toEqual({
      body: "Service body",
      createdAt: noteRecord.createdAt,
      dailyNoteDate: null,
      folderId: "folder-id",
      id: "note-id",
      tags: [],
      title: "Service note",
      type: "note",
      updatedAt: noteRecord.updatedAt,
    });

    expect(repository.restoreNote).toHaveBeenCalledWith(
      "user-id",
      "note-id",
      "2026-07-24T12:00:00.000Z",
      "2026-06-24T12:00:00.000Z",
    );
  });

  it("returns NotFoundError for active notes and trash outside the retention window", async () => {
    repository.restoreNote.mockResolvedValue(null);

    await expect(service.restore("user-id", "note-id")).rejects.toEqual(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: "Note not found",
        statusCode: 404,
      }),
    );
  });
});
