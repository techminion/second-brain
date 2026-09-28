"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { notesRootKey } from "@/shared/lib/query-keys";

import { fetchSearchResults } from "../search-api";

const pageSize = 20;

/**
 * Full-text search results for `query` (FTS-04), paged by the opaque cursor.
 * Keyed under the notes root so every note save, rename or delete refreshes
 * open results; disabled for a blank query (the service would reject it).
 * Previous results stay on screen while the next query loads.
 */
export function useSearch(query: string) {
  const text = query.trim();
  // queryFn first: the page type is inferred from it for getNextPageParam.
  return useInfiniteQuery({
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchSearchResults(text, { cursor: pageParam, limit: pageSize }),
    queryKey: [...notesRootKey, "search", text],
    enabled: text.length > 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    placeholderData: keepPreviousData,
  });
}
