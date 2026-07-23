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
