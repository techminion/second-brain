import { NoteRepository } from "@/features/notes/note-repository";
import type {
  CreateNoteInput,
  ListNotesKeyset,
  ListNotesOptions,
  Note,
  NoteRecord,
  UpdateNoteInput,
} from "@/features/notes/types";
import { retentionWindowDays } from "@/features/retention/constants";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";
import type { Paginated } from "@/shared/types";

type NoteRepositoryContract = Pick<
  NoteRepository,
  "createNote" | "getNote" | "listNotes" | "restoreNote" | "softDeleteNote" | "updateNote"
>;

const defaultListLimit = 50;
const maxListLimit = 100;

const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The list contract declares no errors (05_API §4), so limit and cursor are
// normalized defensively instead of thrown on: out-of-range limits clamp,
// malformed cursors restart from the first page.
function clampListLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return defaultListLimit;
  }

  return Math.min(Math.max(Math.floor(limit), 1), maxListLimit);
}

function encodeListCursor(record: NoteRecord): string {
  return Buffer.from(JSON.stringify({ i: record.id, u: record.updatedAt })).toString("base64url");
}

function decodeListCursor(cursor: string | undefined): ListNotesKeyset | undefined {
  if (!cursor) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "i" in parsed &&
      "u" in parsed &&
      typeof parsed.i === "string" &&
      typeof parsed.u === "string" &&
      uuidPattern.test(parsed.i) &&
      isoTimestampPattern.test(parsed.u)
    ) {
      return { idBefore: parsed.i, updatedAtBefore: parsed.u };
    }
  } catch {
    // Fall through — a cursor that does not decode is treated as absent.
  }

  return undefined;
}

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

  async list(userId: string, options: ListNotesOptions = {}): Promise<Paginated<Note>> {
    const limit = clampListLimit(options.limit);
    const records = await this.repository.listNotes(userId, {
      folderId: options.folderId,
      keysetBefore: decodeListCursor(options.cursor),
      limit: limit + 1,
    });

    const pageRecords = records.slice(0, limit);
    const items = pageRecords.map(mapNote);
    const lastRecord = pageRecords[pageRecords.length - 1];

    return records.length > limit && lastRecord
      ? { items, nextCursor: encodeListCursor(lastRecord) }
      : { items };
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
