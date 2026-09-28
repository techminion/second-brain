"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchTrashList } from "@/features/notes/note-api";

import { noteKeys } from "./note-keys";

/**
 * Restorable trash (NOTE-12, ADR-28): soft-deleted notes inside the 30-day
 * retention window, most recently deleted first, cursor-paginated.
 */
export function useTrashList() {
  return useInfiniteQuery({
    queryKey: noteKeys.trash(),
    queryFn: ({ pageParam }) => fetchTrashList({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
