"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

import { formatLastEdited } from "../format-last-edited";
import { formatTrashExpiry } from "../format-trash-expiry";
import { useRestoreNote } from "../hooks/use-note-mutations";
import { useTrashList } from "../hooks/use-trash-list";
import type { TrashedNote } from "../types";

/**
 * Trash (NOTE-12, FR-KO-3): soft-deleted notes still inside the 30-day
 * retention window, most recently deleted first, each with a Restore action.
 * Restoring removes the row optimistically and returns the note to the
 * sidebar list; the toast offers a direct link to reopen it.
 */
export function TrashView() {
  const router = useRouter();
  const query = useTrashList();
  const restoreNote = useRestoreNote();
  const notes = query.data?.pages.flatMap((page) => page.items) ?? [];

  const handleRestore = (note: TrashedNote) => {
    const title = note.title || "Untitled";

    restoreNote.mutate(note.id, {
      onError: () => toast.error(`Could not restore “${title}”. Please try again.`),
      onSuccess: (restored) =>
        toast.success(`Restored “${title}”`, {
          action: { label: "Open", onClick: () => router.push(`/notes/${restored.id}`) },
        }),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Trash</h1>
        <p className="text-muted-foreground text-sm">
          Deleted notes stay here for 30 days, then they are permanently removed.
        </p>
      </header>

      {query.isPending ? (
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : query.isError ? (
        <p className="text-destructive text-sm" role="alert">
          Could not load the trash. Refresh to try again.
        </p>
      ) : notes.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
          <Trash2 aria-hidden="true" className="size-8" />
          <p className="text-sm">Trash is empty.</p>
          <Link className="text-foreground text-sm underline" href="/">
            Back to notes
          </Link>
        </div>
      ) : (
        <ul aria-label="Deleted notes" className="flex flex-col divide-y rounded-md border">
          {notes.map((note) => {
            const title = note.title || "Untitled";

            return (
              <li className="flex items-center justify-between gap-4 px-4 py-3" key={note.id}>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{title}</span>
                  <span className="text-muted-foreground text-xs">
                    Deleted{" "}
                    <time dateTime={note.deletedAt}>{formatLastEdited(note.deletedAt)}</time> ·{" "}
                    {formatTrashExpiry(note.deletedAt)}
                  </span>
                </div>
                <Button
                  aria-label={`Restore ${title}`}
                  disabled={restoreNote.isPending && restoreNote.variables === note.id}
                  onClick={() => handleRestore(note)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Restore
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {query.hasNextPage ? (
        <Button
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          type="button"
          variant="ghost"
        >
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
