import type {
  Backlink,
  CreateNoteInput,
  ListNotesOptions,
  Note,
  TrashedNote,
  UpdateNoteInput,
} from "@/features/notes/types";
import { requestJson } from "@/shared/lib/api-client";
import type { Paginated, PaginationOptions } from "@/shared/types";

export { ApiError } from "@/shared/lib/api-client";

export function fetchNotesList(options: ListNotesOptions = {}): Promise<Paginated<Note>> {
  const params = new URLSearchParams();

  if (options.folderId) {
    params.set("folderId", options.folderId);
  }

  if (options.cursor) {
    params.set("cursor", options.cursor);
  }

  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }

  const query = params.toString();
  return requestJson<Paginated<Note>>(`/api/notes${query ? `?${query}` : ""}`);
}

export function fetchNote(id: string): Promise<Note> {
  return requestJson<Note>(`/api/notes/${encodeURIComponent(id)}`);
}

export function createNoteRequest(input: CreateNoteInput): Promise<Note> {
  return requestJson<Note>("/api/notes", { body: JSON.stringify(input), method: "POST" });
}

export function updateNoteRequest(id: string, input: UpdateNoteInput): Promise<Note> {
  return requestJson<Note>(`/api/notes/${encodeURIComponent(id)}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export function deleteNoteRequest(id: string): Promise<{ id: string }> {
  return requestJson<{ id: string }>(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchTrashList(options: PaginationOptions = {}): Promise<Paginated<TrashedNote>> {
  const params = new URLSearchParams();

  if (options.cursor) {
    params.set("cursor", options.cursor);
  }

  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }

  const query = params.toString();
  return requestJson<Paginated<TrashedNote>>(`/api/notes/trash${query ? `?${query}` : ""}`);
}

export function restoreNoteRequest(id: string): Promise<Note> {
  return requestJson<Note>(`/api/notes/${encodeURIComponent(id)}/restore`, { method: "POST" });
}

export function addTagRequest(noteId: string, name: string): Promise<Note> {
  return requestJson<Note>(`/api/notes/${encodeURIComponent(noteId)}/tags`, {
    body: JSON.stringify({ name }),
    method: "POST",
  });
}

export function removeTagRequest(noteId: string, tagId: string): Promise<Note> {
  return requestJson<Note>(
    `/api/notes/${encodeURIComponent(noteId)}/tags/${encodeURIComponent(tagId)}`,
    { method: "DELETE" },
  );
}

export function fetchBacklinks(noteId: string): Promise<Backlink[]> {
  return requestJson<Backlink[]>(`/api/notes/${encodeURIComponent(noteId)}/backlinks`);
}
