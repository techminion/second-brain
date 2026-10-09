"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

import { useCreateNote } from "./use-note-mutations";

// Shared by every caller (sidebar button, palette, shortcut, Home), so a
// shortcut press plus a click while a create is in flight still yields one
// note. Each `useCreateNote()` instance has its own `isPending`, and it only
// updates on the next render, so neither is enough on its own.
let createInFlight = false;

/** Test-only: release the shared guard so one test can't leak into the next. */
export function resetCreateAndOpenNoteForTests(): void {
  createInFlight = false;
}

function currentPathname(): string {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

/**
 * The one create-and-open path (UX-07) shared by the sidebar New note button,
 * the palette command, the ⌥⌘N / Ctrl+Alt+N shortcut and Home's quick action:
 * create an "Untitled" note (NOTE-08 optimistic mutation) and open it. A call
 * from any caller while a create is still in flight is a no-op, so a held or
 * repeated shortcut, or a shortcut plus a click, never creates duplicates.
 *
 * Uses `mutateAsync` rather than `mutate(…, { onSuccess, onSettled })`:
 * TanStack Query v5 drops per-call callbacks once the calling component
 * unmounts, and the optimistic insert itself unmounts Home's onboarding
 * button. The promise settles regardless, so the shared guard is always
 * released.
 *
 * It only navigates if the user is still on the page where they asked for the
 * note (UX-07 follow-up): on a slow network they may have moved on, and yanking them to
 * the new note would lose their place. A failed create and a failed
 * navigation get different messages, since only one of them lost the note.
 */
export function useCreateAndOpenNote(): { createAndOpen: () => void; isPending: boolean } {
  const router = useRouter();
  const { isPending, mutateAsync } = useCreateNote();

  const createAndOpen = useCallback(() => {
    if (isPending || createInFlight) {
      return;
    }
    createInFlight = true;
    const startedOn = currentPathname();
    let pending: Promise<{ id: string }>;
    try {
      pending = mutateAsync({ title: "Untitled" });
    } catch (error) {
      createInFlight = false;
      throw error;
    }
    void pending
      .then(
        (note) => {
          if (currentPathname() !== startedOn) {
            return;
          }
          try {
            router.push(`/notes/${note.id}`);
          } catch {
            toast.error("Note created. Open it from the sidebar.");
          }
        },
        () => {
          // The mutation's own onError already rolled back the optimistic row.
          toast.error("Could not create the note. Please try again.");
        },
      )
      .finally(() => {
        createInFlight = false;
      });
  }, [isPending, mutateAsync, router]);

  return { createAndOpen, isPending };
}
