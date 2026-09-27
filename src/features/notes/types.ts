import type { KnowledgeObjectSummary } from "@/shared/types";

export interface CreateNoteInput {
  body?: string;
  folderId?: string;
  title: string;
}

export interface CreateNoteRecordInput {
  body: string;
  dailyNoteDate: string | null;
  folderId: string | null;
  title: string;
}

export interface Note extends KnowledgeObjectSummary {
  body: string;
  dailyNoteDate: string | null;
  folderId: string | null;
}

export interface NoteRecord {
  body: string;
  createdAt: string;
  dailyNoteDate: string | null;
  deletedAt: string | null;
  folderId: string | null;
  id: string;
  ownerId: string;
  title: string;
  updatedAt: string;
}

export interface ListNotesOptions {
  folderId?: string | null;
  cursor?: string;
  limit?: number;
}

export interface ListNotesKeyset {
  idBefore: string;
  updatedAtBefore: string;
}

/**
 * A soft-deleted note as the trash view sees it (ADR-28): the full `Note` plus
 * when it was deleted, so the UI can show how long until the 30-day purge.
 */
export interface TrashedNote extends Note {
  deletedAt: string;
}

export interface ListTrashedNotesKeyset {
  deletedAtBefore: string;
  idBefore: string;
}

export interface ListTrashedNotesRecordOptions {
  keysetBefore?: ListTrashedNotesKeyset;
  limit: number;
  /** Only trash deleted at or after this instant is still restorable. */
  windowStart: string;
}

export interface ListNotesRecordOptions {
  folderId?: string | null;
  keysetBefore?: ListNotesKeyset;
  limit: number;
}

export interface UpdateNoteInput {
  body?: string;
  folderId?: string | null;
  title?: string;
}

export interface UpdateNoteRecordInput {
  body?: string;
  folderId?: string | null;
  title?: string;
}
