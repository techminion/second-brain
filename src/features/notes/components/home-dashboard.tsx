"use client";

import { CalendarDays, FileText, Network, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { markdownToPlainText } from "@/shared/lib/markdown-plain-text";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

import { localIsoDate } from "../daily-note-date";
import { formatLastEdited } from "../format-last-edited";
import { useNotesList } from "../hooks/use-notes-list";
import type { Note } from "../types";
import { NewNoteButton } from "./new-note-button";

const recentLimit = 8;
const previewLength = 80;

const tileClassName =
  "hover:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2";

function preview(note: Note): string {
  return markdownToPlainText(note.body.slice(0, 400)).slice(0, previewLength);
}

function Kbd({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <kbd aria-hidden="true" className="text-muted-foreground ml-auto font-sans text-xs">
      {children}
    </kbd>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <span className="sr-only" role="status">
        Loading your notes…
      </span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function TodayCard({ note }: Readonly<{ note: Note | undefined }>) {
  return (
    <section aria-labelledby="home-today-heading" className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-medium" id="home-today-heading">
        Today
      </h2>
      {note ? (
        <Link
          className="hover:bg-muted focus-visible:ring-ring flex flex-col gap-1 rounded-md border px-4 py-3 outline-none focus-visible:ring-2"
          href={`/notes/${note.id}`}
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium">{note.title || "Untitled"}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              Edited <time dateTime={note.updatedAt}>{formatLastEdited(note.updatedAt)}</time>
            </span>
          </span>
          {preview(note) ? (
            <span className="text-muted-foreground truncate text-xs">{preview(note)}</span>
          ) : null}
        </Link>
      ) : (
        // `/daily` creates today's note on visit, so never prefetch it
        // (same as the sidebar Today row).
        <Link className={cn(tileClassName, "px-4 py-3")} href="/daily" prefetch={false}>
          <CalendarDays aria-hidden="true" className="text-muted-foreground size-4" />
          Open today&apos;s note
          <Kbd>⌘D</Kbd>
        </Link>
      )}
    </section>
  );
}

function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <NewNoteButton className="h-auto justify-start py-2" />
      <Link className={tileClassName} href="/daily" prefetch={false}>
        <CalendarDays aria-hidden="true" className="text-muted-foreground size-4" />
        Today
        <Kbd>⌘D</Kbd>
      </Link>
      <Link className={tileClassName} href="/search">
        <Search aria-hidden="true" className="text-muted-foreground size-4" />
        Search
        <Kbd>⇧⌘F</Kbd>
      </Link>
      <Link className={tileClassName} href="/graph">
        <Network aria-hidden="true" className="text-muted-foreground size-4" />
        Graph
        <Kbd>⇧⌘G</Kbd>
      </Link>
    </nav>
  );
}

function RecentNotes({ notes }: Readonly<{ notes: Note[] }>) {
  return (
    <section aria-labelledby="home-recent-heading" className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-medium" id="home-recent-heading">
        Recent notes
      </h2>
      <ul
        aria-labelledby="home-recent-heading"
        className="flex flex-col divide-y rounded-md border"
      >
        {notes.map((note) => {
          const text = preview(note);
          return (
            <li key={note.id}>
              <Link
                className="hover:bg-muted focus-visible:ring-ring flex flex-col gap-0.5 px-4 py-2.5 outline-none focus-visible:ring-2"
                href={`/notes/${note.id}`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText
                      aria-hidden="true"
                      className="text-muted-foreground size-4 shrink-0"
                    />
                    <span className="truncate text-sm font-medium">{note.title || "Untitled"}</span>
                  </span>
                  <time
                    className="text-muted-foreground shrink-0 text-xs"
                    dateTime={note.updatedAt}
                  >
                    {formatLastEdited(note.updatedAt)}
                  </time>
                </span>
                {text ? (
                  <span className="text-muted-foreground truncate text-xs">{text}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link className="text-foreground self-start text-sm underline" href="/search">
        Search all notes
      </Link>
    </section>
  );
}

/**
 * Home (UX-07): today's note, quick actions and recently edited notes. The
 * FR-AUTH-5 onboarding (`emptyState`, injected by the app layer because it
 * lives in the shell) shows only once the list has resolved with zero notes —
 * never while loading. Uses the unfiltered list query so it shares the
 * `noteKeys.list({})` cache (and optimistic creates) with the sidebar.
 */
export function HomeDashboard({ emptyState }: Readonly<{ emptyState: ReactNode }>) {
  const query = useNotesList();

  if (query.isPending) {
    return <HomeSkeleton />;
  }

  if (query.isError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10">
        <h1 className="text-2xl font-semibold">Home</h1>
        <div className="flex items-center gap-3" role="alert">
          <p className="text-destructive text-sm">Couldn&apos;t load your notes.</p>
          <Button onClick={() => void query.refetch()} size="sm" type="button" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const notes = query.data.pages.flatMap((page) => page.items);

  if (notes.length === 0) {
    return emptyState;
  }

  const today = localIsoDate();
  const todayNote = notes.find((note) => note.dailyNoteDate === today);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="text-muted-foreground text-sm">Pick up where you left off.</p>
      </header>
      <TodayCard note={todayNote} />
      <QuickActions />
      <RecentNotes notes={notes.slice(0, recentLimit)} />
    </div>
  );
}
