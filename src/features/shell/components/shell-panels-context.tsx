"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface ShellPanelsState {
  isLeftExpanded: boolean;
  isRightExpanded: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
}

const ShellPanelsContext = createContext<ShellPanelsState | null>(null);

/**
 * Per-rail expand/collapse state, lifted from the panels themselves so the
 * SHELL-05 shortcuts (⌘\ sidebar, ⌘E context panel) and the command palette
 * can drive the same state the collapse buttons use. Still ephemeral — no
 * persistence, matching SHELL-02's documented behavior.
 */
export function ShellPanelsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isLeftExpanded, setIsLeftExpanded] = useState(true);
  const [isRightExpanded, setIsRightExpanded] = useState(true);

  const toggleLeft = useCallback(() => {
    setIsLeftExpanded((current) => !current);
  }, []);
  const toggleRight = useCallback(() => {
    setIsRightExpanded((current) => !current);
  }, []);

  const state = useMemo(
    () => ({ isLeftExpanded, isRightExpanded, toggleLeft, toggleRight }),
    [isLeftExpanded, isRightExpanded, toggleLeft, toggleRight],
  );

  return <ShellPanelsContext.Provider value={state}>{children}</ShellPanelsContext.Provider>;
}

export function useShellPanels(): ShellPanelsState {
  const state = useContext(ShellPanelsContext);

  if (!state) {
    throw new Error("useShellPanels requires a ShellPanelsProvider ancestor");
  }

  return state;
}
