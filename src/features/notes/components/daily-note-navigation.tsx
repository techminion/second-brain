"use client";

import { CalendarDays, CalendarSearch } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from "@/shared/ui/popover";
import { sidebarItemClassName } from "@/shared/ui/sidebar-section";

import { localIsoDate } from "../daily-note-date";

/**
 * Sidebar daily-note row (UX-04): "Today" (FR-DAILY-1, same target as ⌘D) plus
 * a calendar pop-up that opens any day's note, creating it on demand
 * (FR-DAILY-2). Replaces the always-visible native date field.
 */
export function DailyNoteNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeDate = /^\/daily\/(\d{4}-\d{2}-\d{2})$/.exec(pathname)?.[1];

  return (
    <div className="flex items-center gap-0.5">
      <Link
        aria-current={pathname === "/daily" ? "page" : undefined}
        data-active={pathname === "/daily" ? "" : undefined}
        className={cn(sidebarItemClassName, "flex-1")}
        href="/daily"
        prefetch={false}
      >
        <CalendarDays aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
        Today
        <kbd className="text-muted-foreground ml-auto font-sans text-xs">⌘D</kbd>
      </Link>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          aria-label="Open daily note for date"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2"
        >
          <CalendarSearch aria-hidden="true" className="size-4" />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            align="start"
            className="bg-popover text-popover-foreground z-50 rounded-lg border p-3 shadow-md"
            side="right"
            sideOffset={8}
          >
            <Calendar
              label="Open daily note for date"
              onSelect={(date) => {
                setOpen(false);
                router.push(`/daily/${date}`);
              }}
              selected={activeDate}
              today={localIsoDate()}
            />
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </div>
  );
}
