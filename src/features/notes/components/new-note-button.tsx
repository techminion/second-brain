"use client";

import { SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/ui/button";

import { useCreateNote } from "../hooks/use-note-mutations";

/**
 * The sidebar's primary "New note" action (UX-04): creates an untitled note
 * (NOTE-08 optimistic mutation) and opens it.
 */
export function NewNoteButton() {
  const router = useRouter();
  const createNote = useCreateNote();

  return (
    <Button
      className="w-full justify-start"
      disabled={createNote.isPending}
      onClick={() =>
        createNote.mutate(
          { title: "Untitled" },
          { onSuccess: (note) => router.push(`/notes/${note.id}`) },
        )
      }
      size="sm"
      type="button"
    >
      <SquarePen aria-hidden="true" className="size-4" />
      New note
    </Button>
  );
}
