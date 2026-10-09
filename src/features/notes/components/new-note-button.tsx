"use client";

import { SquarePen } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { useCreateAndOpenNote } from "../hooks/use-create-and-open-note";

/**
 * The sidebar's primary "New note" action (UX-04): creates an untitled note
 * (NOTE-08 optimistic mutation) and opens it, through the shared UX-07
 * create-and-open hook. The ⌥⌘N hint is aria-hidden so the accessible name
 * stays exactly "New note".
 */
export function NewNoteButton({ className }: Readonly<{ className?: string }>) {
  const { createAndOpen, isPending } = useCreateAndOpenNote();

  return (
    <Button
      className={className ?? "w-full justify-start"}
      disabled={isPending}
      onClick={createAndOpen}
      size="sm"
      type="button"
    >
      <SquarePen aria-hidden="true" className="size-4" />
      New note
      <kbd aria-hidden="true" className="ml-auto font-sans text-xs">
        ⌥⌘N
      </kbd>
    </Button>
  );
}
