import type {
  CreateNoteInput,
  ListNotesOptions,
  Note,
  UpdateNoteInput,
} from "@/features/notes/types";
import type { Paginated } from "@/shared/types";

/**
 * Client transport for the NOTE-07 note Web API. Unwraps the `{ data }`
 * envelope and turns a non-2xx `{ error: { code, message } }` response into a
 * typed `ApiError` the TanStack Query hooks (and their consumers) can branch on.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = (payload as ErrorEnvelope | null)?.error;
    throw new ApiError(
      response.status,
      envelope?.code ?? "UNKNOWN",
      envelope?.message ?? "Request failed",
    );
  }

  return (payload as { data: T }).data;
}

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
