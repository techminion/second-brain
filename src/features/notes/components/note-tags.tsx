"use client";

import { useQuery } from "@tanstack/react-query";
import { Hash, X } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { fetchTags } from "@/features/search/search-api";
import { tagsRootKey } from "@/shared/lib/query-keys";
import { cn } from "@/shared/lib/utils";
import type { Tag } from "@/shared/types";

import { useNoteTagMutation } from "../hooks/use-note-mutations";

const maxSuggestions = 8;

/**
 * Tag chips + inline tag input for a note (TAG-04/05, FR-TAG-1/2). Typing
 * suggests existing tags by prefix (08_SEARCH §8) — shares the tag-list cache
 * with the search feature via the root key — and Enter/`,` applies either the
 * highlighted suggestion or the typed name, creating the tag if it is new.
 */
export function NoteTags({ noteId, tags }: Readonly<{ noteId: string; tags: Tag[] }>) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useId();
  const mutation = useNoteTagMutation();
  const allTags = useQuery({ queryKey: [...tagsRootKey, "list"], queryFn: fetchTags });

  const suggestions = useMemo(() => {
    const prefix = draft.trim().replace(/^#+/, "").toLowerCase();
    if (!prefix) {
      return [];
    }
    const applied = new Set(tags.map((tag) => tag.id));
    return (allTags.data ?? [])
      .filter((tag) => !applied.has(tag.id) && tag.name.toLowerCase().startsWith(prefix))
      .slice(0, maxSuggestions);
  }, [allTags.data, draft, tags]);

  const showList = open && suggestions.length > 0;

  const add = (name: string) => {
    const trimmed = name.trim().replace(/^#+/, "").trim();
    setDraft("");
    setActiveIndex(-1);
    if (!trimmed) {
      return;
    }
    mutation.mutate(
      { add: trimmed, noteId },
      { onError: () => toast.error(`Could not add the tag “${trimmed}”.`) },
    );
  };

  const remove = (tag: Tag) =>
    mutation.mutate(
      { noteId, remove: tag.id },
      { onError: () => toast.error(`Could not remove the tag “${tag.name}”.`) },
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.length > 0 ? (
        <ul aria-label="Note tags" className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              className="bg-muted flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs"
              key={tag.id}
            >
              <Link className="hover:underline" href={`/tags/${tag.id}`}>
                #{tag.name}
              </Link>
              <button
                aria-label={`Remove tag ${tag.name}`}
                className="hover:bg-background focus-visible:ring-ring rounded-full p-0.5 outline-none focus-visible:ring-2"
                disabled={mutation.isPending}
                onClick={() => remove(tag)}
                type="button"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <div className="flex items-center gap-1">
          <Hash aria-hidden="true" className="text-muted-foreground size-3.5" />
          <input
            aria-activedescendant={
              showList && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={showList}
            aria-label="Add tag"
            className="placeholder:text-muted-foreground w-32 bg-transparent text-xs outline-none"
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              setDraft(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && suggestions.length > 0) {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
              } else if (event.key === "ArrowUp" && suggestions.length > 0) {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                const active = showList ? suggestions[activeIndex] : undefined;
                add(active ? active.name : draft);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Add tag"
            role="combobox"
            value={draft}
          />
        </div>
        <ul
          className={cn(
            "bg-background absolute top-full left-0 z-20 mt-1 min-w-40 rounded-md border p-1 shadow-md",
            !showList && "hidden",
          )}
          id={listboxId}
          role="listbox"
        >
          {suggestions.map((tag, index) => (
            <li
              aria-selected={index === activeIndex}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1 text-xs",
                index === activeIndex && "bg-muted",
              )}
              id={`${listboxId}-${index}`}
              key={tag.id}
              onMouseDown={(event) => {
                event.preventDefault();
                add(tag.name);
              }}
              role="option"
            >
              #{tag.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
