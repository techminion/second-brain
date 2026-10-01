"use client";

import { Search, Trash2, Waypoints } from "lucide-react";
import type { ReactNode } from "react";

import { SidebarLink } from "./sidebar-link";

interface SidebarNavigationProps {
  /** Primary "New note" action, composed at the app layer (notes feature). */
  newNoteSlot?: ReactNode;
  /** Today + calendar row (DAILY-03/04, UX-04). */
  dailySlot?: ReactNode;
  /** Folder tree section (FOLD-06). */
  foldersSlot?: ReactNode;
  /** Tags section (TAG-07). */
  tagsSlot?: ReactNode;
  /** Note list section (NOTE-09, UX-05). */
  notesSlot?: ReactNode;
}

/**
 * Sidebar layout (UX-04, after Linear and Notion): the primary action and the
 * destinations first — New note, Search, Today, Graph, Trash — then the
 * collapsible knowledge sections in one scroll area. Feature content arrives
 * through slots so the shell stays feature-agnostic; the account menu sits in
 * the panel header.
 */
export function SidebarNavigation({
  dailySlot,
  foldersSlot,
  newNoteSlot,
  notesSlot,
  tagsSlot,
}: Readonly<SidebarNavigationProps>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Knowledge navigation" className="flex flex-col gap-0.5 px-2">
        {newNoteSlot ? <div className="pb-2">{newNoteSlot}</div> : null}
        <SidebarLink href="/search" Icon={Search} shortcut="⇧⌘F">
          Search
        </SidebarLink>
        {dailySlot}
        <SidebarLink href="/graph" Icon={Waypoints}>
          Graph
        </SidebarLink>
        <SidebarLink href="/trash" Icon={Trash2}>
          Trash
        </SidebarLink>
      </nav>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-6">
        {foldersSlot}
        {tagsSlot}
        {notesSlot}
      </div>
    </div>
  );
}
