"use client";

import { Skeleton, SkeletonText } from "@/shared/ui/skeleton";

import { useNoteQuery } from "../hooks/use-note-query";
import { ApiError } from "../note-api";
import { NoteEditor } from "./note-editor";

function NoteViewFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10">{children}</div>;
}

/**
 * Loads a note by id (NOTE-08 `useNoteQuery`) and renders the editor, a
 * skeleton while loading, or a message when the note is missing/inaccessible
 * (404 via ADR-26) or the load fails. Keyed by id so switching notes remounts
 * the editor and reseeds its draft.
 */
export function NoteView({ noteId }: Readonly<{ noteId: string }>) {
  const query = useNoteQuery(noteId);

  if (query.isPending) {
    return (
      <NoteViewFrame>
        <Skeleton className="h-9 w-2/3" />
        <SkeletonText lines={6} />
      </NoteViewFrame>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;

    return (
      <NoteViewFrame>
        <p className="text-muted-foreground text-sm" role="status">
          {notFound
            ? "This note doesn’t exist or has been deleted."
            : "Something went wrong loading this note. Please try again."}
        </p>
      </NoteViewFrame>
    );
  }

  return <NoteEditor key={noteId} note={query.data} />;
}
