"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

import { useCreateNote } from "./use-note-mutations";

/**
 * The one create-and-open path (UX-07) shared by the sidebar New note button,
 * the palette command, the ⌥⌘N / Ctrl+Alt+N shortcut and Home's quick action:
 * create an "Untitled" note (NOTE-08 optimistic mutation) and open it. A call
 * while a create is still in flight is a no-op, so a held or repeated
 * shortcut never creates duplicates.
 */
export function useCreateAndOpenNote(): { createAndOpen: () => void; isPending: boolean } {
  const router = useRouter();
  const createNote = useCreateNote();
  // `isPending` only updates on the next render; the ref closes the gap
  // between two key events dispatched before React re-renders.
  const inFlightRef = useRef(false);
  const { isPending, mutate } = createNote;

  const createAndOpen = useCallback(() => {
    if (isPending || inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    mutate(
      { title: "Untitled" },
      {
        onSettled: () => {
          inFlightRef.current = false;
        },
        onSuccess: (note) => router.push(`/notes/${note.id}`),
      },
    );
  }, [isPending, mutate, router]);

  return { createAndOpen, isPending };
}
