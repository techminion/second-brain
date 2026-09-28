"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useDeferredValue, useEffect, useId, useState } from "react";

import { fetchNotesList } from "@/features/notes/note-api";
import { useQuickOpenState } from "@/features/shell/overlays/quick-open-state";
import { notesRootKey } from "@/shared/lib/query-keys";
import { cn } from "@/shared/lib/utils";

import { fetchTitleSuggestions } from "../search-api";

interface QuickOpenItem {
  id: string;
  title: string;
}

const recentLimit = 8;
const matchLimit = 10;

/**
 * ⌘P quick-open (SRCH-07, 10_DESIGN §8): jump to a note by title. An empty
 * query lists the most recently edited notes; typing ranks titles through
 * `suggestNoteTitles` (trigram, 08_SEARCH §6). Keys live under the notes root
 * so saves and renames refresh the results. Opened by the shell's ⌘P and its
 * palette command; the dialog and its data belong to search.
 */
export function QuickOpen() {
  const { isOpen, setOpen } = useQuickOpenState();
  const router = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query.trim());

  const results = useQuery({
    enabled: isOpen,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<QuickOpenItem[]> =>
      deferredQuery
        ? fetchTitleSuggestions(deferredQuery, matchLimit)
        : (await fetchNotesList({ limit: recentLimit })).items,
    queryKey: [...notesRootKey, "quick-open", deferredQuery],
  });
  const items = results.data ?? [];

  useEffect(() => {
    if (isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery]);

  const activeId = items[activeIndex] ? `${listboxId}-${activeIndex}` : undefined;

  useEffect(() => {
    if (activeId) {
      document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [activeId]);

  const openNote = (item: QuickOpenItem) => {
    setOpen(false);
    router.push(`/notes/${item.id}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) {
        openNote(item);
      }
    }
  };

  const heading = deferredQuery ? "Matching notes" : "Recent notes";
  const empty = results.isFetched && items.length === 0;

  return (
    <Dialog.Root onOpenChange={setOpen} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-foreground/20 fixed inset-0 z-50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="bg-background fixed top-1/4 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border shadow-lg"
        >
          <Dialog.Title className="sr-only">Open a note</Dialog.Title>
          <div className="border-b p-3">
            <input
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={items.length > 0}
              aria-label="Find a note by title"
              autoFocus
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Open a note by title…"
              role="combobox"
              value={query}
            />
          </div>
          {empty ? (
            <p className="text-muted-foreground p-4 text-center text-sm" role="status">
              {deferredQuery ? "No notes match that title." : "No notes yet."}
            </p>
          ) : (
            <ul
              aria-label={heading}
              className="max-h-72 overflow-y-auto p-1"
              id={listboxId}
              role="listbox"
              tabIndex={-1}
            >
              {items.map((item, index) => (
                <li
                  aria-selected={index === activeIndex}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm",
                    index === activeIndex && "bg-muted",
                  )}
                  id={`${listboxId}-${index}`}
                  key={item.id}
                  onClick={() => openNote(item)}
                  onMouseMove={() => setActiveIndex(index)}
                  role="option"
                >
                  <FileText aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
                  <span className="truncate">{item.title || "Untitled"}</span>
                </li>
              ))}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
