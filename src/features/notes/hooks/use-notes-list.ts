"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchNotesList } from "@/features/notes/note-api";

import { noteKeys, type NotesListFilters } from "./note-keys";

/**
 * Cursor-paginated note list (FR-NOTE-6), newest-edited first. Backed by the
 * NOTE-06 keyset endpoint: `getNextPageParam` follows the opaque `nextCursor`,
 * so consumers flatten `data.pages` and call `fetchNextPage` to load more.
 */
export function useNotesList(filters: NotesListFilters = {}) {
  return useInfiniteQuery({
    queryKey: noteKeys.list(filters),
    queryFn: ({ pageParam }) => fetchNotesList({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
