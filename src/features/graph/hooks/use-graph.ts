"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchGraph, fetchLocalGraph } from "@/features/graph/graph-api";
import type { GraphFilter } from "@/features/graph/types";
import { graphRootKey } from "@/shared/lib/query-keys";

// Keys hang off `graphRootKey`, which every note save invalidates (the link
// set may have changed), so the canvas refreshes on the next render.

export function useGlobalGraph(filter: GraphFilter, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => fetchGraph(filter),
    queryKey: [...graphRootKey, "global", filter.tagId ?? null, filter.folderId ?? null],
  });
}

/** Disabled while `noteId` is null (global mode) — never requests an empty id. */
export function useLocalGraph(noteId: string | null, depth: number) {
  return useQuery({
    enabled: noteId !== null,
    queryFn: () => fetchLocalGraph(noteId as string, depth),
    queryKey: [...graphRootKey, "local", noteId, depth],
  });
}
