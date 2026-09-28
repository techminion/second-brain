"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { findInNotePluginKey } from "../find-in-note-extension";
import styles from "./markdown-editor.module.css";

interface FindBarProps {
  editor: Editor;
  /** Changes every time ⌘F is pressed, so a repeat press re-selects the query. */
  openedAt: number;
  initialQuery: string;
  onClose: () => void;
}

/**
 * The ⌘F bar (EDIT-18): type to highlight every match in the note, Enter /
 * ⇧Enter (or the arrows) to step through them, Escape to close and return to
 * the editor with the current match selected. The count is announced politely.
 */
export function FindBar({ editor, initialQuery, onClose, openedAt }: Readonly<FindBarProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const find = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const state = findInNotePluginKey.getState(current.state);
      return {
        count: state?.matches.length ?? 0,
        current: state?.current ?? -1,
        query: state?.query ?? "",
      };
    },
  });

  useEffect(() => {
    if (initialQuery) {
      editor.commands.setFindQuery(initialQuery);
    }
    inputRef.current?.focus();
    inputRef.current?.select();
    // Re-run on every ⌘F press, not on every render.
  }, [openedAt]);

  useEffect(() => () => void editor.commands.clearFind(), [editor]);

  const step = (direction: 1 | -1) => {
    editor.commands.stepFindMatch(direction);
    inputRef.current?.focus();
  };

  // Closing returns to the editor with the current match selected, so the
  // user can type over it or keep editing from there.
  const close = () => {
    onClose();
    // A chain still runs focus() when there is no match to select.
    editor.chain().selectCurrentFindMatch().focus().run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const count = find?.count ?? 0;
  const query = find?.query ?? "";
  const status = !query
    ? ""
    : count === 0
      ? "No matches"
      : `${(find?.current ?? 0) + 1} of ${count}`;

  return (
    <div aria-label="Find in note" className={styles.findBar} role="search">
      <Input
        aria-label="Find in note"
        className="h-8 w-56"
        defaultValue={initialQuery}
        onChange={(event) => editor.commands.setFindQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Find in note"
        ref={inputRef}
        type="search"
      />
      <span aria-live="polite" className="text-muted-foreground min-w-16 text-xs" role="status">
        {status}
      </span>
      <Button
        aria-label="Previous match"
        className="size-8"
        disabled={count === 0}
        onClick={() => step(-1)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ChevronUp aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Next match"
        className="size-8"
        disabled={count === 0}
        onClick={() => step(1)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ChevronDown aria-hidden="true" className="size-4" />
      </Button>
      <Button
        aria-label="Close find"
        className="size-8"
        onClick={close}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
