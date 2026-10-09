import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";

import { shiftIsoDate } from "../daily-note-date";

interface DailyNotePagerProps {
  date: string;
}

/**
 * Previous/next day navigation shown on daily notes (DAILY-05): icon-only, a
 * little tighter below md and 44px on coarse pointers (UX-10).
 */
export function DailyNotePager({ date }: Readonly<DailyNotePagerProps>) {
  const previous = shiftIsoDate(date, -1);
  const next = shiftIsoDate(date, 1);

  return (
    <nav aria-label="Daily notes" className="flex items-center gap-1">
      <Button
        asChild
        className="size-8 md:size-9 pointer-coarse:size-11"
        size="icon"
        variant="ghost"
      >
        <Link aria-label={`Previous day, ${previous}`} href={`/daily/${previous}`} prefetch={false}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
      </Button>
      <Button
        asChild
        className="size-8 md:size-9 pointer-coarse:size-11"
        size="icon"
        variant="ghost"
      >
        <Link aria-label={`Next day, ${next}`} href={`/daily/${next}`} prefetch={false}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </Button>
    </nav>
  );
}
