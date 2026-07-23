import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { NoteService } from "@/features/notes/note-service";
import type { CreateNoteInput, CreateNoteRecordInput, NoteRecord } from "@/features/notes/types";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";

interface MockNoteRepository {
  createNote: Mock<(userId: string, input: CreateNoteRecordInput) => Promise<NoteRecord>>;
  getNote: Mock<(userId: string, noteId: string) => Promise<NoteRecord | null>>;
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
