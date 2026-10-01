"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/utils";

interface CalendarProps {
  /** ISO date (YYYY-MM-DD) for "today" in the user's local calendar. */
  today: string;
  /** ISO date the grid opens on and highlights; defaults to `today`. */
  selected?: string;
  onSelect: (isoDate: string) => void;
  /** Accessible name for the date grid. */
  label?: string;
}

const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/** Monday-first weeks covering the month that contains `iso`. */
function monthGrid(iso: string): string[][] {
  const first = parseIso(iso);
  first.setDate(1);
  const offset = (first.getDay() + 6) % 7;
  const start = toIso(first);
  const days: string[] = [];
  for (let index = -offset; days.length < 42; index += 1) {
    days.push(addDays(start, index));
  }
  const weeks: string[][] = [];
  for (let week = 0; week < 6; week += 1) {
    weeks.push(days.slice(week * 7, week * 7 + 7));
  }
  return weeks.filter((week) => week.some((day) => day.slice(0, 7) === iso.slice(0, 7)));
}

const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });

/**
 * A small month calendar (UX-04) following the WAI-ARIA date-grid pattern:
 * one tab stop on the focused day; arrows move by day/week, PageUp/PageDown by
 * month, Home/End to the week's ends, Enter/Space selects.
 */
export function Calendar({ label = "Choose a date", onSelect, selected, today }: CalendarProps) {
  const [focused, setFocused] = useState(selected ?? today);
  const gridRef = useRef<HTMLTableElement>(null);
  const keyboardMove = useRef(false);

  useEffect(() => {
    if (keyboardMove.current) {
      keyboardMove.current = false;
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
    }
  }, [focused]);

  const moveMonths = (months: number) => {
    const date = parseIso(focused);
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + months);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
    return toIso(date);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const weekday = (parseIso(focused).getDay() + 6) % 7;
    const next: Record<string, () => string> = {
      ArrowDown: () => addDays(focused, 7),
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      End: () => addDays(focused, 6 - weekday),
      Home: () => addDays(focused, -weekday),
      PageDown: () => moveMonths(1),
      PageUp: () => moveMonths(-1),
    };
    const move = next[event.key];
    if (move) {
      event.preventDefault();
      keyboardMove.current = true;
      setFocused(move());
    }
  };

  const weeks = monthGrid(focused);
  const navButton =
    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex size-7 items-center justify-center rounded-md outline-none focus-visible:ring-2";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          aria-label="Previous month"
          className={navButton}
          onClick={() => setFocused(moveMonths(-1))}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <p aria-live="polite" className="text-sm font-medium">
          {monthFormat.format(parseIso(focused))}
        </p>
        <button
          aria-label="Next month"
          className={navButton}
          onClick={() => setFocused(moveMonths(1))}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      <table
        aria-label={label}
        className="border-collapse"
        onKeyDown={onKeyDown}
        ref={gridRef}
        role="grid"
      >
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th
                className="text-muted-foreground size-8 text-xs font-normal"
                key={day}
                scope="col"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((day) => {
                const inMonth = day.slice(0, 7) === focused.slice(0, 7);
                const isSelected = day === (selected ?? null);
                return (
                  <td className="p-0" key={day}>
                    <button
                      aria-current={day === today ? "date" : undefined}
                      aria-label={dayFormat.format(parseIso(day))}
                      aria-pressed={isSelected}
                      className={cn(
                        "hover:bg-muted focus-visible:ring-ring flex size-8 items-center justify-center rounded-md text-sm outline-none focus-visible:ring-2",
                        !inMonth && "text-muted-foreground",
                        day === today && "text-primary font-semibold",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                      )}
                      data-date={day}
                      onClick={() => onSelect(day)}
                      tabIndex={day === focused ? 0 : -1}
                      type="button"
                    >
                      {Number(day.slice(8))}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
