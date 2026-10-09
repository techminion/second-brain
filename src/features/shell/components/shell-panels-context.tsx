"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  type RefObject,
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
  /**
   * The control that opened each drawer (the mobile top bar's toggles, or the
   * tablet's floating context toggle), so focus can return to it on close.
   */
  leftToggleRef: RefObject<HTMLButtonElement | null>;
  rightToggleRef: RefObject<HTMLButtonElement | null>;
  /** Set when a drawer closes because of navigation: focus goes to the new page. */
  skipFocusReturnRef: RefObject<boolean>;
  /** Lock body scroll while a drawer is open; call the result to release. */
  lockScroll: () => () => void;
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
interface PanelState {
  tier: BreakpointTier;
  left: boolean;
  right: boolean;
}

function forTier(state: PanelState, tier: BreakpointTier): PanelState {
  return state.tier === tier ? state : { tier, ...tierDefaults[tier] };
}

export function ShellPanelsProvider({ children }: Readonly<{ children: ReactNode }>) {
  const tier = useBreakpointTier();
  // Expansion is stored with the tier it belongs to. Crossing a breakpoint is a
  // deliberate context change, so each rail returns to its tier default; this
  // is derived during render (not in an effect), so no render ever shows one
  // tier with another tier's state — e.g. mobile drawers open with the
  // desktop defaults on first load (UX-10 review).
  const [stored, setStored] = useState<PanelState>({ tier: "desktop", ...tierDefaults.desktop });
  const current = forTier(stored, tier);
  const leftToggleRef = useRef<HTMLButtonElement | null>(null);
  const rightToggleRef = useRef<HTMLButtonElement | null>(null);
  const skipFocusReturnRef = useRef(false);
  const openDrawers = useRef(0);
  const savedOverflow = useRef("");

  const update = useCallback(
    (change: (state: PanelState) => Partial<PanelState>) =>
      setStored((previous) => {
        const base = forTier(previous, tier);
        return { ...base, ...change(base) };
      }),
    [tier],
  );

  const toggleLeft = useCallback(() => update((s) => ({ left: !s.left })), [update]);
  const toggleRight = useCallback(() => update((s) => ({ right: !s.right })), [update]);
  const collapseLeft = useCallback(() => update(() => ({ left: false })), [update]);
  const collapseRight = useCallback(() => update(() => ({ right: false })), [update]);

  // One body scroll lock for all open drawers: lock on the first, restore the
  // original overflow when the last one closes.
  const lockScroll = useCallback(() => {
    if (openDrawers.current === 0) {
      savedOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openDrawers.current += 1;
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      openDrawers.current -= 1;
      if (openDrawers.current === 0) {
        document.body.style.overflow = savedOverflow.current;
      }
    };
  }, []);

  const state = useMemo(
    () => ({
      collapseLeft,
      collapseRight,
      isLeftExpanded: current.left,
      isRightExpanded: current.right,
      leftToggleRef,
      lockScroll,
      rightToggleRef,
      skipFocusReturnRef,
      tier,
      toggleLeft,
      toggleRight,
    }),
    [
      collapseLeft,
      collapseRight,
      current.left,
      current.right,
      lockScroll,
      tier,
      toggleLeft,
      toggleRight,
    ],
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

/**
 * Following a link from a drawer should show the destination, not leave the
 * drawer covering it (UX-10): overlay panels close on navigation. In-flow
 * panels (desktop, and the tablet sidebar) keep their state. Rendered by the
 * AppShell (it needs the router's pathname, which the provider does not).
 */
export function CloseDrawersOnNavigation(): null {
  const { collapseLeft, collapseRight, isLeftExpanded, isRightExpanded, skipFocusReturnRef, tier } =
    useShellPanels();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (pathname === previousPathname.current) {
      return;
    }

    previousPathname.current = pathname;
    if ((tier === "mobile" && isLeftExpanded) || (tier !== "desktop" && isRightExpanded)) {
      skipFocusReturnRef.current = true;
    }
    if (tier === "mobile") {
      collapseLeft();
    }
    if (tier !== "desktop") {
      collapseRight();
    }
    // isLeft/RightExpanded are read for the flag only; re-running on their
    // change is harmless because the pathname guard returns early.
  }, [
    collapseLeft,
    collapseRight,
    isLeftExpanded,
    isRightExpanded,
    pathname,
    skipFocusReturnRef,
    tier,
  ]);

  return null;
}
