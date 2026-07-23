import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateNoteRecordInput,
  NoteRecord,
  UpdateNoteRecordInput,
} from "@/features/notes/types";

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
  )
`;

interface NoteSubtypeRow {
  body: string;
  daily_note_date: string | null;
  folder_id: string | null;
}

interface NoteQueryRow {
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
