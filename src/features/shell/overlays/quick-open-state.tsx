"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

interface QuickOpenState {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

const QuickOpenContext = createContext<QuickOpenState | null>(null);

/**
 * Open state for ⌘P quick-open (SRCH-07). The shell owns *when* it opens —
 * the ⌘P shortcut and the palette command — while the dialog itself (and its
 * data) belongs to the search feature and is injected through the shell's
 * `overlays` slot, so the shell stays feature-agnostic.
 */
export function QuickOpenStateProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, setOpen }), [isOpen]);
  return <QuickOpenContext.Provider value={value}>{children}</QuickOpenContext.Provider>;
}

export function useQuickOpenState(): QuickOpenState {
  const state = useContext(QuickOpenContext);
  if (!state) {
    throw new Error("useQuickOpenState requires a QuickOpenStateProvider ancestor");
  }
  return state;
}
