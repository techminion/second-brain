"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { isIsoDate } from "../daily-note-date";

/**
 * Sidebar daily-note section: a "Today" entry (FR-DAILY-1, same target as ⌘D)
 * and a date field that opens any day's note, creating it on demand
 * (FR-DAILY-2). Injected into the shell by the app layout.
 */
export function DailyNoteNavigation() {
  const router = useRouter();
  const dateId = useId();

  return (
    <section aria-labelledby="sidebar-daily-note" className="flex flex-col gap-1">
      <h2
        className="text-muted-foreground flex h-9 items-center gap-2 px-2 text-sm font-medium"
        id="sidebar-daily-note"
      >
        <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
        Daily note
      </h2>
      <Button asChild className="w-full justify-start" size="sm" variant="ghost">
        <Link href="/daily" prefetch={false}>
          Today
          <kbd className="text-muted-foreground ml-auto font-sans text-xs">⌘D</kbd>
        </Link>
      </Button>
      <label className="sr-only" htmlFor={dateId}>
        Open daily note for date
      </label>
      <Input
        className="h-8 text-sm"
        id={dateId}
        onChange={(event) => {
          if (isIsoDate(event.target.value)) {
            router.push(`/daily/${event.target.value}`);
          }
        }}
        type="date"
      />
    </section>
  );
}
