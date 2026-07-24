"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

import { formatLastEdited } from "../format-last-edited";
import { useCreateNote } from "../hooks/use-note-mutations";
import { useNotesList } from "../hooks/use-notes-list";

/**
 * Note list in the sidebar (FR-NOTE-6): titles + last-edited, each linking to
 * its editor page, newest-edited first. The header's "New note" affordance
 * creates a note (NOTE-08 optimistic mutation) and opens it. Its own `nav`
 * landmark, distinct from the section-frame navigation.
 */
export function SidebarNoteList() {
  const router = useRouter();
  const pathname = usePathname();
  const query = useNotesList();
  const createNote = useCreateNote();

  const notes = query.data?.pages.flatMap((page) => page.items) ?? [];

  const handleCreate = () => {
    createNote.mutate(
      { title: "Untitled" },
      { onSuccess: (note) => router.push(`/notes/${note.id}`) },
    );
  };

  return (
    <nav
      aria-label="Notes"
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pt-2"
    >
      <div className="flex items-center justify-between px-2">
        <h2 className="text-muted-foreground text-sm font-medium" id="sidebar-notes-heading">
          Notes
        </h2>
        <Button
          aria-label="New note"
          className="text-muted-foreground hover:text-foreground size-7 shrink-0"
          disabled={createNote.isPending}
          onClick={handleCreate}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-1 px-2 py-1" aria-hidden="true">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-muted-foreground px-2 py-1 text-sm">No notes yet.</p>
      ) : (
        <ul aria-labelledby="sidebar-notes-heading" className="flex flex-col">
          {notes.map((note) => {
            const active = pathname === `/notes/${note.id}`;

            return (
              <li key={note.id}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "hover:bg-muted flex flex-col rounded-md px-2 py-1.5",
                    active && "bg-muted",
                  )}
                  href={`/notes/${note.id}`}
                >
                  <span className="truncate text-sm">{note.title || "Untitled"}</span>
                  <time
                    className={cn(
                      "text-xs",
                      // muted-foreground on the filled active bg-muted dips below
                      // AA contrast (~4.43:1); foreground keeps the active row
                      // readable, matching the SHELL-09 kbd fix.
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                    dateTime={note.updatedAt}
                  >
                    {formatLastEdited(note.updatedAt)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
