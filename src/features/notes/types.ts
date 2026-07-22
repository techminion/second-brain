export interface CreateNoteRecordInput {
  body: string;
  dailyNoteDate: string | null;
  folderId: string | null;
  title: string;
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

export interface UpdateNoteRecordInput {
  body?: string;
  folderId?: string | null;
  title?: string;
}
