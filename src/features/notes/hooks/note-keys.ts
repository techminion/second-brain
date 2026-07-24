export interface NotesListFilters {
  folderId?: string;
  limit?: number;
}

/**
 * TanStack Query key factory for notes. Everything hangs off `["notes"]` so a
 * single `invalidateQueries({ queryKey: noteKeys.all })` clears the whole
 * feature; `lists()` scopes list caches (all filter variants) for optimistic
 * mutation updates, and `detail(id)` is one note's cache.
 */
export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (filters: NotesListFilters = {}) => [...noteKeys.lists(), filters] as const,
  details: () => [...noteKeys.all, "detail"] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};
