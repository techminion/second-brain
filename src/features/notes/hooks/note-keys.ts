import { notesRootKey } from "@/shared/lib/query-keys";

export interface NotesListFilters {
  folderId?: string;
  limit?: number;
}

/**
 * TanStack Query key factory for notes. Everything hangs off `["notes"]` so a
 * single `invalidateQueries({ queryKey: noteKeys.all })` clears the whole
 * feature; `lists()` scopes list caches (all filter variants) for optimistic
 * mutation updates, `detail(id)` is one note's cache, and `trash()` is the
 * restorable-trash listing (NOTE-12) — deliberately outside `lists()` so the
 * active-list optimistic updaters never touch it.
 */
export const noteKeys = {
  all: notesRootKey,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (filters: NotesListFilters = {}) => [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
  trash: () => [...noteKeys.all, "trash"] as const,
};
