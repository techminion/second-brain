"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { noteDragType } from "@/shared/lib/drag-data";
import { markdownToPlainText } from "@/shared/lib/markdown-plain-text";
import { cn } from "@/shared/lib/utils";
import { SidebarSection } from "@/shared/ui/sidebar-section";
import { Skeleton } from "@/shared/ui/skeleton";

import { formatLastEdited } from "../format-last-edited";
import { groupByRecency } from "../group-by-recency";
import { useNotesList } from "../hooks/use-notes-list";

const previewLength = 80;

/**
 * Note list in the sidebar (FR-NOTE-6, UX-05): titles with a one-line preview
 * and last-edited time, newest first, grouped Today / Yesterday / Previous 7
 * days / … (Apple Notes style). Its own `nav` landmark, distinct from the
 * section-frame navigation; creating notes lives in the sidebar's New note
 * button (UX-04).
 */
export function SidebarNoteList() {
  const pathname = usePathname();
  const query = useNotesList();

  const notes = query.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = groupByRecency(notes, (note) => note.updatedAt);

  return (
    <nav aria-label="Notes">
      <SidebarSection Icon={FileText} id="sidebar-notes-heading" title="Notes">
        {query.isPending ? (
          <div className="flex flex-col gap-1 px-2 py-1" aria-hidden="true">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/6" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1 text-sm">No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => {
              const groupId = `sidebar-notes-${group.label.toLowerCase().replaceAll(" ", "-")}`;
              return (
                <div key={group.label}>
                  <h3 className="text-muted-foreground px-2 pt-1 pb-0.5 text-xs" id={groupId}>
                    {group.label}
                  </h3>
                  <ul aria-labelledby={groupId} className="flex flex-col">
                    {group.items.map((note) => {
                      const active = pathname === `/notes/${note.id}`;
                      const preview = markdownToPlainText(note.body.slice(0, 400)).slice(
                        0,
                        previewLength,
                      );

                      return (
                        <li key={note.id}>
                          <Link
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "hover:bg-muted flex flex-col rounded-md px-2 py-1.5",
                              active && "bg-muted",
                            )}
                            href={`/notes/${note.id}`}
                            onDragStart={(event) => {
                              // Drop onto a sidebar folder to move the note (FOLD-08).
                              event.dataTransfer.setData(noteDragType, note.id);
                              event.dataTransfer.effectAllowed = "move";
                            }}
                          >
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {note.title || "Untitled"}
                              </span>
                              <time
                                className={cn(
                                  "shrink-0 text-xs",
                                  // muted-foreground on the filled active bg-muted
                                  // keeps AA (ADR-39), but foreground reads better.
                                  active ? "text-foreground" : "text-muted-foreground",
                                )}
                                dateTime={note.updatedAt}
                              >
                                {formatLastEdited(note.updatedAt)}
                              </time>
                            </span>
                            {preview ? (
                              <span
                                className={cn(
                                  "truncate text-xs",
                                  active ? "text-foreground" : "text-muted-foreground",
                                )}
                              >
                                {preview}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </SidebarSection>
    </nav>
  );
}
