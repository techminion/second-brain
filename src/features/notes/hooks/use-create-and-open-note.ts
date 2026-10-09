"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useCreateNote } from "./use-note-mutations";

// Shared by every caller (sidebar button, palette, shortcut, Home), so a
// shortcut press plus a click while a create is in flight still yields one
// note. Each `useCreateNote()` instance has its own `isPending`, and it only
// updates on the next render, so neither is enough on its own.
let createInFlight = false;

/**
 * The one create-and-open path (UX-07) shared by the sidebar New note button,
 * the palette command, the ⌥⌘N / Ctrl+Alt+N shortcut and Home's quick action:
 * create an "Untitled" note (NOTE-08 optimistic mutation) and open it. A call
 * from any caller while a create is still in flight is a no-op, so a held or
 * repeated shortcut, or a shortcut plus a click, never creates duplicates.
 */
export function useCreateAndOpenNote(): { createAndOpen: () => void; isPending: boolean } {
  const router = useRouter();
  const { isPending, mutate } = useCreateNote();

  const createAndOpen = useCallback(() => {
    if (isPending || createInFlight) {
      return;
    }
    createInFlight = true;
    try {
      mutate(
        { title: "Untitled" },
        {
          onSettled: () => {
            createInFlight = false;
          },
          onSuccess: (note) => router.push(`/notes/${note.id}`),
        },
      );
    } catch (error) {
      createInFlight = false;
      throw error;
    }
  }, [isPending, mutate, router]);

  return { createAndOpen, isPending };
}
