"use client";

import { Link2, MoreHorizontal, Trash2, Waypoints } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { DeleteNoteDialog } from "./delete-note-dialog";

interface NoteActionsMenuProps {
  isSaving: boolean;
  noteId: string;
  noteTitle: string;
}

const itemClass =
  "hover:bg-muted focus:bg-muted flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none";

/**
 * The note's ⋯ menu (UX-02): secondary and destructive actions live here
 * instead of competing with the title (10_DESIGN §2.1). Delete still opens the
 * named confirmation (10_DESIGN §4).
 */
export function NoteActionsMenu({ isSaving, noteId, noteTitle }: NoteActionsMenuProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/notes/${noteId}`);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Note actions"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-7 items-center justify-center rounded-md outline-none focus-visible:ring-2 pointer-coarse:size-11"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            align="end"
            className="bg-popover text-popover-foreground z-50 min-w-48 rounded-lg border p-1 shadow-md"
          >
            <DropdownMenuItem asChild className={itemClass}>
              <Link href={`/graph?note=${noteId}`}>
                <Waypoints aria-hidden="true" className="text-muted-foreground size-4" />
                Open in graph
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={itemClass} onSelect={() => void copyLink()}>
              <Link2 aria-hidden="true" className="text-muted-foreground size-4" />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border my-1 h-px" />
            <DropdownMenuItem className={itemClass} onSelect={() => setConfirmingDelete(true)}>
              <Trash2 aria-hidden="true" className="text-destructive size-4" />
              Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
      <DeleteNoteDialog
        isSaving={isSaving}
        noteId={noteId}
        noteTitle={noteTitle}
        onOpenChange={setConfirmingDelete}
        open={confirmingDelete}
      />
    </>
  );
}
