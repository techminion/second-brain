"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Skeleton } from "@/shared/ui/skeleton";

import { localIsoDate, shiftIsoDate } from "../daily-note-date";

/**
 * `/daily` → `/daily/<today>`. "Today" is the user's local calendar day, which
 * only the browser knows, so the hop happens client-side (FR-DAILY-1).
 * `offsetDays` shifts from today (e.g. -1 for the palette's "Yesterday").
 */
export function OpenTodayRedirect({ offsetDays = 0 }: Readonly<{ offsetDays?: number }>) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/daily/${shiftIsoDate(localIsoDate(), offsetDays)}`);
  }, [offsetDays, router]);

  return (
    <div aria-busy="true" className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10">
      <span className="sr-only">Opening today’s note…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
