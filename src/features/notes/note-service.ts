import { NoteRepository } from "@/features/notes/note-repository";
import type {
  CreateNoteInput,
  ListNotesKeyset,
  ListNotesOptions,
  ListTrashedNotesKeyset,
  Note,
  NoteRecord,
  TrashedNote,
  UpdateNoteInput,
} from "@/features/notes/types";
import { retentionWindowDays } from "@/features/retention/constants";
import { NotFoundError, ValidationError } from "@/shared/lib/errors";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";
import type { Paginated, PaginationOptions } from "@/shared/types";

import { isIsoDate } from "./daily-note-date";

type NoteRepositoryContract = Pick<
  NoteRepository,
  | "createDailyNote"
  | "createNote"
  | "getDailyNote"
  | "getNote"
  | "listNotes"
  | "listTrashedNotes"
  | "restoreNote"
  | "softDeleteNote"
  | "updateNote"
>;

const defaultListLimit = 50;

/**
 * Fixed MVP daily-note template (DAILY-02, ADR-29). User-editable templates
 * are a later decision.
 */
export const dailyNoteTemplate = "## Notes\n\n\n## Tasks\n\n- [ ] ";
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

interface DecodedCursor {
  id: string;
  timestamp: string;
}

// Cursors are opaque base64url `{ i: id, u: timestamp }` pairs. `list` keys on
// `updated_at`, `listTrash` on `deleted_at`; the shape is shared.
function encodeCursor(id: string, timestamp: string): string {
  return Buffer.from(JSON.stringify({ i: id, u: timestamp })).toString("base64url");
}

function decodeListCursor(cursor: string | undefined): ListNotesKeyset | undefined {
  const decoded = decodeCursor(cursor);
  return decoded ? { idBefore: decoded.id, updatedAtBefore: decoded.timestamp } : undefined;
}

function decodeTrashCursor(cursor: string | undefined): ListTrashedNotesKeyset | undefined {
  const decoded = decodeCursor(cursor);
  return decoded ? { deletedAtBefore: decoded.timestamp, idBefore: decoded.id } : undefined;
}

function decodeCursor(cursor: string | undefined): DecodedCursor | undefined {
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
      return { id: parsed.i, timestamp: parsed.u };
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
      ? { items, nextCursor: encodeCursor(lastRecord.id, lastRecord.updatedAt) }
      : { items };
  }

  /**
   * Open the daily note for a calendar date (FR-DAILY-1/2/3, ADR-29): return the
   * active note; if that date's note is in trash, restore it (the unique index
   * still holds the trashed row, and restoring keeps its content); otherwise
   * create it with the ISO date as title and the fixed template as body. A
   * concurrent create that loses the unique-index race re-reads the winner, so
   * this never surfaces a `ConflictError` (05_API §4).
   */
  async getOrCreateDailyNote(userId: string, date: string): Promise<Note> {
    if (!isIsoDate(date)) {
      throw new ValidationError("Date must be a calendar date in YYYY-MM-DD form");
    }

    const existing = await this.repository.getDailyNote(userId, date);
    if (existing) {
      return this.activateDailyNote(userId, existing);
    }

    const created = await this.repository.createDailyNote(userId, {
      body: dailyNoteTemplate,
      dailyNoteDate: date,
      folderId: null,
      title: date,
    });
    if (created) {
      return mapNote(created);
    }

    const winner = await this.repository.getDailyNote(userId, date);
    if (!winner) {
      throw new Error("Daily note vanished after a create conflict");
    }

    return this.activateDailyNote(userId, winner);
  }

  private async activateDailyNote(userId: string, record: NoteRecord): Promise<Note> {
    if (record.deletedAt === null) {
      return mapNote(record);
    }

    // Auto-restore ignores the retention window: an expired-but-unpurged
    // daily note still occupies the date, and bringing it back is the only
    // way to open that day without losing content.
    const restored = await this.repository.restoreNote(
      userId,
      record.id,
      new Date().toISOString(),
      new Date(0).toISOString(),
    );

    if (!restored) {
      throw new NotFoundError("Note not found");
    }

    return mapNote(restored);
  }

  /**
   * Restorable trash (ADR-28): soft-deleted notes still inside the 30-day
   * retention window, most recently deleted first. Like `list`, it declares no
   * errors — limit and cursor are normalized, not rejected.
   */
  async listTrash(
    userId: string,
    options: PaginationOptions = {},
  ): Promise<Paginated<TrashedNote>> {
    const limit = clampListLimit(options.limit);
    const records = await this.repository.listTrashedNotes(userId, {
      keysetBefore: decodeTrashCursor(options.cursor),
      limit: limit + 1,
      windowStart: retentionWindowStart(new Date()),
    });

    const pageRecords = records.slice(0, limit);
    const items = pageRecords.flatMap((record) =>
      record.deletedAt === null ? [] : [{ ...mapNote(record), deletedAt: record.deletedAt }],
    );
    const lastRecord = pageRecords[pageRecords.length - 1];

    return records.length > limit && lastRecord?.deletedAt
      ? { items, nextCursor: encodeCursor(lastRecord.id, lastRecord.deletedAt) }
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

export async function createNoteService(): Promise<NoteService> {
  const client = await createServerActionSupabaseClient();
  return new NoteService(new NoteRepository(client));
}
