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
export function NewNoteButton({
  className,
  variant = "default",
}: Readonly<{ className?: string; variant?: "default" | "icon" }>) {
  const { createAndOpen, isPending } = useCreateAndOpenNote();

  if (variant === "icon") {
    // The mobile top bar's always-visible entry point (UX-10).
    return (
      <Button
        aria-label="New note"
        className={className ?? "size-9 shrink-0 pointer-coarse:size-11"}
        disabled={isPending}
        onClick={createAndOpen}
        size="icon"
        title="New note"
        type="button"
        variant="ghost"
      >
        <SquarePen aria-hidden="true" className="size-4" />
      </Button>
    );
  }

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
