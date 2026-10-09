"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ShellPanel } from "./shell-panel";

// Routes that show a single note: its own page and daily notes (UX-06).
const notePagePattern = /^\/(notes\/[^/]+|daily(\/[^/]+)?)$/;

/** Whether a route shows the right context panel (also used by the mobile top bar). */
export function hasNoteContextPanel(pathname: string | null): boolean {
  return pathname !== null && notePagePattern.test(pathname);
}

/**
 * The right context panel (backlinks) only where it has a note to describe
 * (UX-06) — elsewhere it could only say "Open a note…", so it takes no room.
 */
export function NoteContextPanel({ children }: Readonly<{ children?: ReactNode }>) {
  const pathname = usePathname();

  if (!hasNoteContextPanel(pathname)) {
    return null;
  }

  return (
    <ShellPanel label="Context panel" side="right">
      {children}
    </ShellPanel>
  );
}
