import { NoteRepository } from "@/features/notes/note-repository";
import type { CreateNoteInput, Note, NoteRecord, UpdateNoteInput } from "@/features/notes/types";
import { retentionWindowDays } from "@/features/retention/constants";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";

type NoteRepositoryContract = Pick<
  NoteRepository,
  "createNote" | "getNote" | "restoreNote" | "softDeleteNote" | "updateNote"
>;

function retentionWindowStart(reference: Date): string {
  const windowStart = new Date(reference);
  windowStart.setUTCDate(windowStart.getUTCDate() - retentionWindowDays);
  return windowStart.toISOString();
}

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

function validateUpdateInput(input: UpdateNoteInput): void {
  if (input.title !== undefined) {
    if (typeof input.title !== "string") {
      throw new ValidationError("Title must be a string");
    }

    if (input.title.length === 0) {
      throw new ValidationError("Title must not be empty");
    }
  }

  if (input.body !== undefined && typeof input.body !== "string") {
    throw new ValidationError("Body must be a string");
  }

  if (
    input.folderId !== undefined &&
    input.folderId !== null &&
    typeof input.folderId !== "string"
  ) {
    throw new ValidationError("Folder id must be a string or null");
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

  async update(userId: string, noteId: string, input: UpdateNoteInput): Promise<Note> {
    validateUpdateInput(input);

    const record = await this.repository.updateNote(userId, noteId, {
      body: input.body,
      folderId: input.folderId,
      title: input.title,
    });

    // The update_note RPC refuses nonexistent, foreign-owned, and soft-deleted
    // targets alike (ADR-26); deletedAt is re-checked defensively.
    if (!record || record.deletedAt !== null) {
      throw new NotFoundError("Note not found");
    }

    return mapNote(record);
  }

  async delete(userId: string, noteId: string): Promise<void> {
    const deleted = await this.repository.softDeleteNote(userId, noteId, new Date().toISOString());

    if (!deleted) {
      throw new NotFoundError("Note not found");
    }
  }

  async restore(userId: string, noteId: string): Promise<Note> {
    const now = new Date();
    const record = await this.repository.restoreNote(
      userId,
      noteId,
      now.toISOString(),
      retentionWindowStart(now),
    );

    if (!record) {
      throw new NotFoundError("Note not found");
    }

    return mapNote(record);
  }
}
