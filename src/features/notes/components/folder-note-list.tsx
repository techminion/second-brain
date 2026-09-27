"use client";

import { FilePlus, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

import { formatLastEdited } from "../format-last-edited";
import { useCreateNote } from "../hooks/use-note-mutations";
import { useNotesList } from "../hooks/use-notes-list";

/**
 * Notes filed directly in one folder (FOLD-13 folder filter), newest-edited
 * first, with an empty-folder state that offers to create the first note in
 * place (FOLD-14).
 */
export function FolderNoteList({ folderId }: Readonly<{ folderId: string }>) {
  const router = useRouter();
  const query = useNotesList({ folderId });
  const createNote = useCreateNote();
  const notes = query.data?.pages.flatMap((page) => page.items) ?? [];

  const create = () =>
    createNote.mutate(
      { folderId, title: "Untitled" },
      { onSuccess: (note) => router.push(`/notes/${note.id}`) },
    );

  if (query.isPending) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-md border border-dashed py-12 text-center">
        <FolderOpen aria-hidden="true" className="size-8" />
        <p className="text-sm">This folder is empty.</p>
        <p className="text-xs">
          Create a note here, or drag notes from the sidebar onto the folder.
        </p>
        <Button disabled={createNote.isPending} onClick={create} size="sm" type="button">
          <FilePlus aria-hidden="true" className="size-4" />
          New note in this folder
        </Button>
      </div>
    );
  }

  return (
    <section aria-labelledby="folder-notes-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium" id="folder-notes-heading">
          Notes
        </h2>
        <Button
          disabled={createNote.isPending}
          onClick={create}
          size="sm"
          type="button"
          variant="outline"
        >
          <FilePlus aria-hidden="true" className="size-4" />
          New note
        </Button>
      </div>
      <ul className="flex flex-col divide-y rounded-md border">
        {notes.map((note) => (
          <li key={note.id}>
            <Link className="hover:bg-muted flex flex-col px-4 py-3" href={`/notes/${note.id}`}>
              <span className="truncate text-sm font-medium">{note.title || "Untitled"}</span>
              <time className="text-muted-foreground text-xs" dateTime={note.updatedAt}>
                {formatLastEdited(note.updatedAt)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          type="button"
          variant="ghost"
        >
          Load more
        </Button>
      ) : null}
    </section>
  );
}
