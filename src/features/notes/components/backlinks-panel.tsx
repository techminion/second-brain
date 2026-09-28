"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Skeleton } from "@/shared/ui/skeleton";

import { useBacklinks } from "../hooks/use-backlinks";

function noteIdFromPath(pathname: string): string | undefined {
  const match = /^\/notes\/([^/]+)$/.exec(pathname);
  return match?.[1];
}

/**
 * Context-panel backlinks (BACK-03..05, FR-LINK-5): the notes linking to the
 * open note, each with the text around its link, newest-edited first. Shows
 * on note pages only; elsewhere it explains what the panel is for.
 */
export function BacklinksPanel() {
  const noteId = noteIdFromPath(usePathname());
  const query = useBacklinks(noteId);

  return (
    <section aria-labelledby="backlinks-heading" className="flex flex-col gap-3 p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium" id="backlinks-heading">
        <Link2 aria-hidden="true" className="size-4" />
        Backlinks
        {query.data && query.data.length > 0 ? (
          <span className="text-muted-foreground font-normal">{query.data.length}</span>
        ) : null}
      </h2>

      {!noteId ? (
        <p className="text-muted-foreground text-sm">Open a note to see what links to it.</p>
      ) : query.isPending ? (
        <div aria-hidden="true" className="flex flex-col gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : query.isError ? (
        <p className="text-muted-foreground text-sm" role="status">
          Backlinks are unavailable for this note.
        </p>
      ) : query.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No notes link here yet. Type <kbd className="font-mono">[[</kbd> in another note to link
          to this one.
        </p>
      ) : (
        <ul aria-labelledby="backlinks-heading" className="flex flex-col gap-2">
          {query.data.map(({ object, snippet }) => (
            <li key={object.id}>
              <Link
                className="hover:bg-muted flex flex-col gap-1 rounded-md border p-3"
                href={`/notes/${object.id}`}
              >
                <span className="truncate text-sm font-medium">{object.title || "Untitled"}</span>
                {snippet ? (
                  <span className="text-muted-foreground line-clamp-3 text-xs">{snippet}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
