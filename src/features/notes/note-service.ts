import { NoteRepository } from "@/features/notes/note-repository";
import type {
  Backlink,
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
import {
  clampListLimit,
  decodeCursor,
  encodeCursor,
  uuidPattern,
} from "@/shared/lib/keyset-cursor";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";
import type { Paginated, PaginationOptions } from "@/shared/types";

import { isIsoDate } from "./daily-note-date";
import { extractWikiLinkTitles, wikiLinkSnippet } from "./wiki-links";

type NoteRepositoryContract = Pick<
  NoteRepository,
  | "attachTag"
  | "detachTag"
  | "findOrCreateTag"
  | "getTagsForObjects"
  | "listBacklinks"
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

const maxTagNameLength = 64;

/**
 * Fixed MVP daily-note template (DAILY-02, ADR-29). User-editable templates
 * are a later decision.
 */
export const dailyNoteTemplate = "## Notes\n\n\n## Tasks\n\n- [ ] ";

function decodeListCursor(cursor: string | undefined): ListNotesKeyset | undefined {
  const decoded = decodeCursor(cursor);
  return decoded ? { idBefore: decoded.id, updatedAtBefore: decoded.timestamp } : undefined;
}

function decodeTrashCursor(cursor: string | undefined): ListTrashedNotesKeyset | undefined {
  const decoded = decodeCursor(cursor);
  return decoded ? { deletedAtBefore: decoded.timestamp, idBefore: decoded.id } : undefined;
}

function retentionWindowStart(reference: Date): string {
  const windowStart = new Date(reference);
  windowStart.setUTCDate(windowStart.getUTCDate() - retentionWindowDays);
  return windowStart.toISOString();
}

/** Trimmed, `#`-prefix-stripped, non-empty tag name (FR-TAG-2). */
function normalizeTagName(tagName: unknown): string {
  if (typeof tagName !== "string") {
    throw new ValidationError("Tag name must be a string");
  }

  const name = tagName.trim().replace(/^#+/, "").trim();
  if (name.length === 0) {
    throw new ValidationError("Tag name must not be empty");
  }

  if (name.length > maxTagNameLength) {
    throw new ValidationError(`Tag name must be at most ${maxTagNameLength} characters`);
  }

  return name;
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
    tags: record.tags ?? [],
    title: record.title,
    type: "note",
    updatedAt: record.updatedAt,
  };
}

export class NoteService {
  constructor(private readonly repository: NoteRepositoryContract) {}

  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    validateCreateInput(input);

    const body = input.body ?? "";
    const record = await this.repository.createNote(userId, {
      body,
      dailyNoteDate: null,
      folderId: input.folderId ?? null,
      linkTitles: extractWikiLinkTitles(body),
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

    // Links are re-derived from the body in the same transaction as the save
    // (FR-LINK-6); a title change also rewrites `[[old]]` in linking notes.
    const record = await this.repository.updateNote(userId, noteId, {
      body: input.body,
      folderId: input.folderId,
      linkTitles: input.body === undefined ? undefined : extractWikiLinkTitles(input.body),
      title: input.title,
    });

    // The update_note RPC refuses nonexistent, foreign-owned, and soft-deleted
    // targets alike (ADR-26); deletedAt is re-checked defensively.
    if (!record || record.deletedAt !== null) {
      throw new NotFoundError("Note not found");
    }

    return this.withTags(userId, record);
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
  /**
   * Tag a note by name (FR-TAG-1/2): the tag is created on first use,
   * case-insensitively deduplicated per owner, and attaching it again is a
   * no-op. Returns the note with its current tags.
   */
  async addTag(userId: string, noteId: string, tagName: string): Promise<Note> {
    const name = normalizeTagName(tagName);
    await this.get(userId, noteId);

    const tag = await this.repository.findOrCreateTag(userId, name);
    await this.repository.attachTag(userId, noteId, tag.id);

    return this.get(userId, noteId);
  }

  /** Remove a tag from a note; removing an absent tag is a no-op. */
  async removeTag(userId: string, noteId: string, tagId: string): Promise<Note> {
    await this.get(userId, noteId);

    if (typeof tagId === "string" && uuidPattern.test(tagId)) {
      await this.repository.detachTag(userId, noteId, tagId);
    }

    return this.get(userId, noteId);
  }

  /**
   * Notes linking to this one (FR-LINK-5) with the text around each link.
   * Trashed sources are excluded; the snippet falls back to the body's start
   * when the link text no longer matches the current title.
   */
  async getBacklinks(userId: string, noteId: string): Promise<Backlink[]> {
    const target = await this.get(userId, noteId);
    const records = await this.repository.listBacklinks(userId, target.id);

    return records.map(({ body, summary }) => ({
      object: summary,
      snippet:
        wikiLinkSnippet(body, target.title) || body.replace(/\s+/g, " ").trim().slice(0, 120),
    }));
  }

  private async withTags(userId: string, record: NoteRecord): Promise<Note> {
    const tags = await this.repository.getTagsForObjects(userId, [record.id]);
    return mapNote({ ...record, tags: tags.get(record.id) ?? [] });
  }

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
