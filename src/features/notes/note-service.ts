import { NoteRepository } from "@/features/notes/note-repository";
import type { CreateNoteInput, Note, NoteRecord } from "@/features/notes/types";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";

type NoteRepositoryContract = Pick<NoteRepository, "createNote" | "getNote">;

function validateCreateInput(input: CreateNoteInput): void {
  if (typeof input.title !== "string") {
    throw new ValidationError("Title must be a string");
  }

  if (input.title.length === 0) {
    throw new ValidationError("Title must not be empty");
  }

  if (input.body !== undefined && typeof input.body !== "string") {
    throw new ValidationError("Body must be a string");
  }

  if (input.folderId !== undefined && typeof input.folderId !== "string") {
    throw new ValidationError("Folder id must be a string");
  }
}

function mapNote(record: NoteRecord): Note {
  return {
    body: record.body,
    createdAt: record.createdAt,
    dailyNoteDate: record.dailyNoteDate,
    folderId: record.folderId,
    id: record.id,
    tags: [],
    title: record.title,
    type: "note",
    updatedAt: record.updatedAt,
  };
}

export class NoteService {
  constructor(private readonly repository: NoteRepositoryContract) {}

  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    validateCreateInput(input);

    const record = await this.repository.createNote(userId, {
      body: input.body ?? "",
      dailyNoteDate: null,
      folderId: input.folderId ?? null,
      title: input.title,
    });

    return mapNote(record);
  }

  async get(userId: string, noteId: string): Promise<Note> {
    const record = await this.repository.getNote(userId, noteId);

    if (!record || record.deletedAt !== null) {
      throw new NotFoundError("Note not found");
    }

    return mapNote(record);
  }
}
