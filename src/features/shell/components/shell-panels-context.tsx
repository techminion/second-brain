"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { type BreakpointTier, useBreakpointTier } from "../hooks/use-breakpoint-tier";

interface ShellPanelsState {
  tier: BreakpointTier;
  isLeftExpanded: boolean;
  isRightExpanded: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  collapseLeft: () => void;
  collapseRight: () => void;
}

const ShellPanelsContext = createContext<ShellPanelsState | null>(null);

// 10_DESIGN §11 defaults per tier: full shell on desktop, sidebar collapsed at
// the narrow (tablet) end, and both panels closed as drawers on mobile.
const tierDefaults: Record<BreakpointTier, { left: boolean; right: boolean }> = {
  desktop: { left: true, right: true },
  // Below desktop the right panel is a closed overlay so it never covers
  // content on load; the sidebar is collapsed at the narrow end.
  tablet: { left: false, right: false },
  mobile: { left: false, right: false },
};

/**
 * Per-rail expand/collapse state (SHELL-02, ephemeral). SHELL-05 shortcuts and
 * the command palette drive the same state as the collapse buttons; SHELL-06
 * additionally resets each rail to its tier default when the viewport crosses a
 * breakpoint, and exposes the tier so panels choose in-flow vs. overlay
 * rendering.
 */
export function ShellPanelsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const tier = useBreakpointTier();
  const [isLeftExpanded, setIsLeftExpanded] = useState(tierDefaults.desktop.left);
  const [isRightExpanded, setIsRightExpanded] = useState(tierDefaults.desktop.right);
  const previousTier = useRef<BreakpointTier>("desktop");

  // Crossing a breakpoint is a deliberate context change, so each rail returns
  // to its tier default rather than carrying an intent that no longer fits.
  useEffect(() => {
    if (tier === previousTier.current) {
      return;
    }

    previousTier.current = tier;
    setIsLeftExpanded(tierDefaults[tier].left);
    setIsRightExpanded(tierDefaults[tier].right);
  }, [tier]);

  const toggleLeft = useCallback(() => setIsLeftExpanded((current) => !current), []);
  const toggleRight = useCallback(() => setIsRightExpanded((current) => !current), []);
  const collapseLeft = useCallback(() => setIsLeftExpanded(false), []);
  const collapseRight = useCallback(() => setIsRightExpanded(false), []);

  const state = useMemo(
    () => ({
      collapseLeft,
      collapseRight,
      isLeftExpanded,
      isRightExpanded,
      tier,
      toggleLeft,
      toggleRight,
    }),
    [collapseLeft, collapseRight, isLeftExpanded, isRightExpanded, tier, toggleLeft, toggleRight],
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
