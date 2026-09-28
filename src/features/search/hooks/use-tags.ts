"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { fetchObjectsByTag, fetchTags } from "@/features/search/search-api";
import { tagsRootKey } from "@/shared/lib/query-keys";

export const tagKeys = {
  all: tagsRootKey,
  list: () => [...tagKeys.all, "list"] as const,
  objects: (tagId: string) => [...tagKeys.all, "objects", tagId] as const,
};

/** Every tag the user owns (FR-TAG-3), also the source for tag suggestions. */
export function useTags() {
  return useQuery({ queryKey: tagKeys.list(), queryFn: fetchTags });
}

/** Objects carrying a tag, newest-edited first, cursor-paginated. */
export function useObjectsByTag(tagId: string) {
  return useInfiniteQuery({
    queryKey: tagKeys.objects(tagId),
    queryFn: ({ pageParam }) => fetchObjectsByTag(tagId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
