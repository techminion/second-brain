"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchBacklinks } from "@/features/notes/note-api";

import { noteKeys } from "./note-keys";

/**
 * Backlinks for a note (BACK-02, FR-LINK-5). Every note save invalidates all
 * backlink caches (see `useUpdateNote`), and the query refetches on mount, so
 * a link added in another note shows up on the next page load (FR-LINK-6).
 */
export function useBacklinks(noteId: string | undefined) {
  return useQuery({
    enabled: Boolean(noteId),
    queryKey: noteKeys.backlinks(noteId ?? ""),
    queryFn: () => fetchBacklinks(noteId as string),
    refetchOnMount: "always",
  });
}
