"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MarkdownEditor } from "@/features/editor";
import { FolderPicker } from "@/features/folders";
import type { Note, UpdateNoteInput } from "@/features/notes/types";
import { Input } from "@/shared/ui/input";

import { useAutosave } from "../hooks/use-autosave";
import { useUpdateNote } from "../hooks/use-note-mutations";
import { useWikiLinkController } from "../hooks/use-wiki-link-controller";
import { DailyNotePager } from "./daily-note-pager";
import { DeleteNoteDialog } from "./delete-note-dialog";
import { NoteTags } from "./note-tags";

/**
 * The loaded note surface: an editable title + the markdown body editor, with
 * debounced autosave and save-on-blur (10_DESIGN §5 / FR-NOTE-5) — no save
 * button. Seeded once from `note`; thereafter the local draft is the source of
 * truth, so background refetches never clobber in-progress edits (the parent
 * keys this component by note id, so switching notes remounts).
 */
export function NoteEditor({ note }: Readonly<{ note: Note }>) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [dirty, setDirty] = useState(false);
  const mutation = useUpdateNote();
  const mutate = mutation.mutate;

  const draft = useRef({ body, title });
  draft.current = { body, title };

  const save = useCallback(() => {
    const { body: currentBody, title: currentTitle } = draft.current;
    // Body always saves; title only when non-empty (the update contract rejects
    // an empty title), so clearing the title never spams failed saves.
    const input: UpdateNoteInput = { body: currentBody };
    if (currentTitle.trim() !== "") {
      input.title = currentTitle;
    }

    mutate(
      { id: note.id, input },
      { onError: () => toast.error("Could not save your note. It will retry on your next edit.") },
    );
  }, [mutate, note.id]);

  const { flush, schedule } = useAutosave(save);
  const wikiLinks = useWikiLinkController(note.id, title, flush);

  // Clear the dirty flag once a save lands (while mounted); `save` itself never
  // touches state, so the unmount flush stays warning-free.
  useEffect(() => {
    if (mutation.isSuccess) {
      setDirty(false);
    }
  }, [mutation.isSuccess, mutation.submittedAt]);

  const handleTitle = (next: string) => {
    setTitle(next);
    setDirty(true);
    schedule();
  };

  const handleBody = (next: string) => {
    setBody(next);
    setDirty(true);
    schedule();
  };

  const status = mutation.isError
    ? "Save failed"
    : mutation.isPending || dirty
      ? "Saving…"
      : "Saved";

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10" onBlur={flush}>
      <div className="flex items-start justify-between gap-4">
        <Input
          aria-label="Note title"
          className="h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
          onChange={(event) => handleTitle(event.target.value)}
          placeholder="Untitled"
          value={title}
        />
        <div className="flex shrink-0 items-center gap-3">
          {note.dailyNoteDate ? <DailyNotePager date={note.dailyNoteDate} /> : null}
          <Link
            aria-label="Open local graph"
            className="text-muted-foreground hover:text-foreground text-sm underline"
            href={`/graph?note=${note.id}`}
          >
            Graph
          </Link>
          <span aria-live="polite" className="text-muted-foreground text-sm" role="status">
            {status}
          </span>
          <DeleteNoteDialog
            isSaving={mutation.isPending}
            noteId={note.id}
            noteTitle={title.trim() || "Untitled"}
          />
        </div>
      </div>
      <NoteTags noteId={note.id} tags={note.tags} />
      <FolderPicker
        onChange={(folderId) =>
          mutate(
            { id: note.id, input: { folderId } },
            { onError: () => toast.error("Could not move your note.") },
          )
        }
        value={note.folderId}
      />
      {title.trim() === "" ? (
        <p className="text-destructive text-sm">Add a title to save this note’s name.</p>
      ) : null}
      <MarkdownEditor
        ariaLabel="Note body"
        onChange={handleBody}
        value={body}
        wikiLinks={wikiLinks}
      />
    </article>
  );
}
