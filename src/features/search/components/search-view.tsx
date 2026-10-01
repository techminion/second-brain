"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";

import { useSearch } from "../hooks/use-search";
import { SearchSnippet } from "./search-snippet";

const urlSyncDelayMs = 250;

/**
 * The full-text search page (FTS-05/09, FR-SEARCH-1/2). The query lives in the
 * URL (`/search?q=`) so results are linkable and survive reloads; typing
 * updates it after a short pause. ↓ from the field moves into the results,
 * ↑/↓ move between them, Enter opens one, and Escape returns to the field.
 */
export function SearchView({ initialQuery }: Readonly<{ initialQuery: string }>) {
  const router = useRouter();
  const pathname = usePathname();
  const inputId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery.trim());

  useEffect(() => {
    const next = query.trim();
    if (next === submitted) {
      return;
    }
    const timer = setTimeout(() => {
      setSubmitted(next);
      router.replace(next ? `${pathname}?q=${encodeURIComponent(next)}` : pathname, {
        scroll: false,
      });
    }, urlSyncDelayMs);
    return () => clearTimeout(timer);
  }, [pathname, query, router, submitted]);

  const search = useSearch(submitted);
  const results = search.data?.pages.flatMap((page) => page.items) ?? [];

  const resultLinks = () => [...(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      resultLinks()[0]?.focus();
    } else if (event.key === "Enter") {
      setSubmitted(query.trim());
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const links = resultLinks();
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      links[Math.min(index + 1, links.length - 1)]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index <= 0) {
        inputRef.current?.focus();
      } else {
        links[index - 1]?.focus();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Search</h1>
      <div className="relative" role="search">
        <label className="sr-only" htmlFor={inputId}>
          Search notes
        </label>
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4"
        />
        <Input
          autoFocus
          className="pl-9"
          id={inputId}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder='Search your notes — "exact phrase", -exclude, or'
          ref={inputRef}
          type="search"
          value={query}
        />
      </div>

      {!submitted ? (
        <p className="text-muted-foreground text-sm">
          Search the titles and text of all your notes. Use quotes for an exact phrase, a leading
          minus to exclude a word, and <kbd className="font-mono">or</kbd> for either word.
        </p>
      ) : search.isPending ? (
        <div aria-busy="true" aria-label="Loading results" className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : search.isError ? (
        <p className="text-muted-foreground text-sm" role="status">
          Search is unavailable right now. Please try again.
        </p>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          No notes match “{submitted}”. Try fewer or different words.
        </p>
      ) : (
        <section aria-labelledby={`${inputId}-results`} className="flex flex-col gap-3">
          <h2 className="sr-only" id={`${inputId}-results`}>
            Results for “{submitted}”
          </h2>
          <p aria-live="polite" className="text-muted-foreground text-sm" role="status">
            {results.length}
            {search.hasNextPage ? "+" : ""} {results.length === 1 ? "note" : "notes"}
          </p>
          <ol
            aria-label="Search results"
            className="flex flex-col gap-2"
            onKeyDown={onListKeyDown}
            ref={listRef}
          >
            {results.map((result) => (
              <li key={result.object.id}>
                <Link
                  className="hover:bg-muted focus-visible:ring-ring flex flex-col gap-1 rounded-md border p-3 outline-none focus-visible:ring-2"
                  href={`/notes/${result.object.id}`}
                >
                  <span className="font-medium">{result.object.title || "Untitled"}</span>
                  <span className="text-muted-foreground line-clamp-3 text-sm">
                    <SearchSnippet snippet={result.snippet} />
                  </span>
                  {result.object.tags.length > 0 ? (
                    <span className="text-tag-text text-xs">
                      {result.object.tags.map((tag) => `#${tag.name}`).join(" ")}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
          {search.hasNextPage ? (
            <Button
              className="self-start"
              disabled={search.isFetchingNextPage}
              onClick={() => void search.fetchNextPage()}
              type="button"
              variant="outline"
            >
              {search.isFetchingNextPage ? "Loading…" : "Load more results"}
            </Button>
          ) : null}
        </section>
      )}
    </div>
  );
}
