import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateNoteRecordInput,
  ListNotesRecordOptions,
  ListTrashedNotesRecordOptions,
  NoteRecord,
  UpdateNoteRecordInput,
} from "@/features/notes/types";
import type { Tag } from "@/shared/types";

const noteSelect = `
  id,
  owner_id,
  title,
  created_at,
  updated_at,
  deleted_at,
  notes!inner (
    body,
    folder_id,
    daily_note_date
  ),
  knowledge_object_tags (
    tags ( id, name )
  )
`;

interface TagJoinRow {
  tags: Tag | Tag[] | null;
}

function mapTagJoinRows(rows: TagJoinRow[] | null | undefined): Tag[] {
  return (rows ?? [])
    .flatMap((row) => (Array.isArray(row.tags) ? row.tags : row.tags ? [row.tags] : []))
    .map((tag) => ({ id: tag.id, name: tag.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Escape LIKE wildcards so `ilike` performs a case-insensitive *exact* match. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

interface NoteSubtypeRow {
  body: string;
  daily_note_date: string | null;
  folder_id: string | null;
}

interface NoteQueryRow {
  knowledge_object_tags?: TagJoinRow[] | null;
  created_at: string;
  deleted_at: string | null;
  id: string;
  notes: NoteSubtypeRow | NoteSubtypeRow[];
  owner_id: string;
  title: string;
  updated_at: string;
}

interface NoteRpcRow {
  body: string;
  created_at: string;
  daily_note_date: string | null;
  deleted_at: string | null;
  folder_id: string | null;
  id: string;
  owner_id: string;
  title: string;
  updated_at: string;
}

function getNoteSubtype(row: NoteQueryRow): NoteSubtypeRow {
  if (Array.isArray(row.notes)) {
    const note = row.notes[0];

    if (note) {
      return note;
    }
  } else {
    return row.notes;
  }

  throw new Error("Unable to map note without its subtype row");
}

function mapNoteQueryRow(row: NoteQueryRow): NoteRecord {
  const note = getNoteSubtype(row);

  return {
    body: note.body,
    createdAt: row.created_at,
    dailyNoteDate: note.daily_note_date,
    deletedAt: row.deleted_at,
    folderId: note.folder_id,
    id: row.id,
    ownerId: row.owner_id,
    tags: mapTagJoinRows(row.knowledge_object_tags),
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function mapNoteRpcRow(row: NoteRpcRow): NoteRecord {
  return {
    body: row.body,
    createdAt: row.created_at,
    dailyNoteDate: row.daily_note_date,
    deletedAt: row.deleted_at,
    folderId: row.folder_id,
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export class NoteRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createNote(userId: string, input: CreateNoteRecordInput): Promise<NoteRecord> {
    const { data, error } = await this.client
      .rpc("create_note", {
        p_body: input.body,
        p_daily_note_date: input.dailyNoteDate,
        p_folder_id: input.folderId,
        p_owner_id: userId,
        p_title: input.title,
      })
      .single();

    if (error || !data) {
      throw new Error("Unable to create note", { cause: error ?? undefined });
    }

    return mapNoteRpcRow(data as NoteRpcRow);
  }

  /**
   * Create a daily note, or return null when the `(owner_id, daily_note_date)`
   * unique index already holds one (a concurrent get-or-create won the race).
   * `create_note` is a single statement, so a conflict leaves no orphan
   * envelope row behind.
   */
  async createDailyNote(
    userId: string,
    input: CreateNoteRecordInput & { dailyNoteDate: string },
  ): Promise<NoteRecord | null> {
    try {
      return await this.createNote(userId, input);
    } catch (error) {
      const cause = error instanceof Error ? (error.cause as { code?: string } | undefined) : null;

      if (cause?.code === "23505") {
        return null;
      }

      throw error;
    }
  }

  /** The owner's daily note for a date, in any deletion state (trash included). */
  async getDailyNote(userId: string, date: string): Promise<NoteRecord | null> {
    const { data, error } = await this.client
      .from("knowledge_objects")
      .select(noteSelect)
      .eq("owner_id", userId)
      .eq("type", "note")
      .eq("notes.daily_note_date", date)
      .maybeSingle();

    if (error) {
      throw new Error("Unable to read daily note", { cause: error });
    }

    return data ? mapNoteQueryRow(data as NoteQueryRow) : null;
  }

  async getNote(userId: string, noteId: string): Promise<NoteRecord | null> {
    const { data, error } = await this.client
      .from("knowledge_objects")
      .select(noteSelect)
      .eq("id", noteId)
      .eq("owner_id", userId)
      .eq("type", "note")
      .maybeSingle();

    if (error) {
      throw new Error("Unable to read note", { cause: error });
    }

    return data ? mapNoteQueryRow(data as NoteQueryRow) : null;
  }

  async updateNote(
    userId: string,
    noteId: string,
    input: UpdateNoteRecordInput,
  ): Promise<NoteRecord | null> {
    const { data, error } = await this.client
      .rpc("update_note", {
        p_body: input.body ?? null,
        p_folder_id: input.folderId ?? null,
        p_knowledge_object_id: noteId,
        p_owner_id: userId,
        p_title: input.title ?? null,
        p_update_body: input.body !== undefined,
        p_update_folder: input.folderId !== undefined,
        p_update_title: input.title !== undefined,
      })
      .maybeSingle();

    if (error) {
      throw new Error("Unable to update note", { cause: error });
    }

    return data ? mapNoteRpcRow(data as NoteRpcRow) : null;
  }

  async listNotes(userId: string, options: ListNotesRecordOptions): Promise<NoteRecord[]> {
    let query = this.client
      .from("knowledge_objects")
      .select(noteSelect)
      .eq("owner_id", userId)
      .eq("type", "note")
      .is("deleted_at", null);

    if (options.folderId !== undefined) {
      query =
        options.folderId === null
          ? query.is("notes.folder_id", null)
          : query.eq("notes.folder_id", options.folderId);
    }

    if (options.keysetBefore) {
      const { idBefore, updatedAtBefore } = options.keysetBefore;
      query = query.or(
        `updated_at.lt."${updatedAtBefore}",and(updated_at.eq."${updatedAtBefore}",id.lt."${idBefore}")`,
      );
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(options.limit);

    if (error) {
      throw new Error("Unable to list notes", { cause: error });
    }

    return (data as NoteQueryRow[]).map(mapNoteQueryRow);
  }

  async listTrashedNotes(
    userId: string,
    options: ListTrashedNotesRecordOptions,
  ): Promise<NoteRecord[]> {
    // Deliberate trash query (04_DATABASE §6): soft-deleted notes still inside
    // the retention window, most recently deleted first. Expired trash awaiting
    // the purge worker is excluded — it can no longer be restored.
    let query = this.client
      .from("knowledge_objects")
      .select(noteSelect)
      .eq("owner_id", userId)
      .eq("type", "note")
      .not("deleted_at", "is", null)
      .gte("deleted_at", options.windowStart);

    if (options.keysetBefore) {
      const { deletedAtBefore, idBefore } = options.keysetBefore;
      query = query.or(
        `deleted_at.lt."${deletedAtBefore}",and(deleted_at.eq."${deletedAtBefore}",id.lt."${idBefore}")`,
      );
    }

    const { data, error } = await query
      .order("deleted_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(options.limit);

    if (error) {
      throw new Error("Unable to list trashed notes", { cause: error });
    }

    return (data as NoteQueryRow[]).map(mapNoteQueryRow);
  }

  /** Tags on the given objects, keyed by object id (for RPC results that lack them). */
  async getTagsForObjects(userId: string, objectIds: string[]): Promise<Map<string, Tag[]>> {
    const result = new Map<string, Tag[]>(objectIds.map((id) => [id, []]));

    if (objectIds.length === 0) {
      return result;
    }

    const { data, error } = await this.client
      .from("knowledge_object_tags")
      .select("knowledge_object_id, tags ( id, name )")
      .eq("owner_id", userId)
      .in("knowledge_object_id", objectIds);

    if (error) {
      throw new Error("Unable to read tags", { cause: error });
    }

    for (const row of data as (TagJoinRow & { knowledge_object_id: string })[]) {
      result.set(row.knowledge_object_id, [
        ...(result.get(row.knowledge_object_id) ?? []),
        ...mapTagJoinRows([row]),
      ]);
    }

    for (const [id, tags] of result) {
      result.set(
        id,
        [...tags].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }

    return result;
  }

  /**
   * The owner's tag with this name, case-insensitively (the `(owner_id,
   * lower(name))` unique index), creating it if absent (FR-TAG-2). A create
   * that loses a concurrent race re-reads the winner.
   */
  async findOrCreateTag(userId: string, name: string): Promise<Tag> {
    const existing = await this.findTagByName(userId, name);
    if (existing) {
      return existing;
    }

    const { data, error } = await this.client
      .from("tags")
      .insert({ name, owner_id: userId })
      .select("id, name")
      .single();

    if (!error && data) {
      return data as Tag;
    }

    if (error?.code === "23505") {
      const winner = await this.findTagByName(userId, name);
      if (winner) {
        return winner;
      }
    }

    throw new Error("Unable to create tag", { cause: error ?? undefined });
  }

  private async findTagByName(userId: string, name: string): Promise<Tag | null> {
    const { data, error } = await this.client
      .from("tags")
      .select("id, name")
      .eq("owner_id", userId)
      .ilike("name", escapeLikePattern(name))
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error("Unable to read tag", { cause: error });
    }

    return (data as Tag | null) ?? null;
  }

  /** Attach a tag to an object; attaching twice is a no-op (composite PK). */
  async attachTag(userId: string, objectId: string, tagId: string): Promise<void> {
    const { error } = await this.client
      .from("knowledge_object_tags")
      .insert({ knowledge_object_id: objectId, owner_id: userId, tag_id: tagId });

    if (error && error.code !== "23505") {
      throw new Error("Unable to attach tag", { cause: error });
    }
  }

  async detachTag(userId: string, objectId: string, tagId: string): Promise<void> {
    const { error } = await this.client
      .from("knowledge_object_tags")
      .delete()
      .eq("owner_id", userId)
      .eq("knowledge_object_id", objectId)
      .eq("tag_id", tagId);

    if (error) {
      throw new Error("Unable to detach tag", { cause: error });
    }
  }

  async softDeleteNote(userId: string, noteId: string, deletedAt: string): Promise<boolean> {
    // The deleted_at guard keeps a repeat delete from refreshing the timestamp,
    // which would silently restart the retention-purge clock (ADR-18).
    const { data, error } = await this.client
      .from("knowledge_objects")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("id", noteId)
      .eq("owner_id", userId)
      .eq("type", "note")
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error("Unable to soft-delete note", { cause: error });
    }

    return data !== null;
  }

  async restoreNote(
    userId: string,
    noteId: string,
    restoredAt: string,
    windowStart: string,
  ): Promise<NoteRecord | null> {
    // Only rows soft-deleted within the retention window are restorable;
    // active notes and expired trash both fall through to null.
    const { data, error } = await this.client
      .from("knowledge_objects")
      .update({ deleted_at: null, updated_at: restoredAt })
      .eq("id", noteId)
      .eq("owner_id", userId)
      .eq("type", "note")
      .not("deleted_at", "is", null)
      .gte("deleted_at", windowStart)
      .select(noteSelect)
      .maybeSingle();

    if (error) {
      throw new Error("Unable to restore note", { cause: error });
    }

    return data ? mapNoteQueryRow(data as NoteQueryRow) : null;
  }
}
