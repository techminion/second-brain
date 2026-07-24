"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchNote } from "@/features/notes/note-api";

import { noteKeys } from "./note-keys";

/**
 * A single note by id (NOTE-10's editor page). `enabled` guards the fetch until
 * an id is known, so the hook is safe to call before a route param resolves.
 */
export function useNoteQuery(id: string | undefined) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ""),
    queryFn: () => fetchNote(id as string),
    enabled: Boolean(id),
  });
}
