"use client";

import {
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { type ReactNode, type RefObject, useEffect, useRef } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

import type { BreakpointTier } from "../hooks/use-breakpoint-tier";
import { useShellPanels } from "./shell-panels-context";

type ShellPanelSide = "left" | "right";

interface ShellPanelProps {
  children?: ReactNode;
  /** Shown beside the collapse toggle while expanded (the sidebar's account menu, UX-04). */
  headerStart?: ReactNode;
  label: string;
  side: ShellPanelSide;
}

interface PanelControl {
  Icon: LucideIcon;
  label: string;
}

export function getPanelControl(side: ShellPanelSide, isExpanded: boolean): PanelControl {
  if (side === "left") {
    return isExpanded
      ? { Icon: PanelLeftClose, label: "Collapse application sidebar" }
      : { Icon: PanelLeftOpen, label: "Expand application sidebar" };
  }

  return isExpanded
    ? { Icon: PanelRightClose, label: "Collapse context panel" }
    : { Icon: PanelRightOpen, label: "Expand context panel" };
}

// 10_DESIGN §11: the right panel is an overlay below desktop; the sidebar only
// becomes a drawer at the mobile end. Everything else stays in the layout flow.
function isOverlaySide(side: ShellPanelSide, tier: BreakpointTier): boolean {
  if (tier === "desktop") {
    return false;
  }

  return side === "right" || tier === "mobile";
}

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * While an overlay drawer is open (UX-10): focus moves into it, Tab cycles
 * inside it, Escape closes it, and the page behind does not scroll (one
 * shared lock in the provider). On close, focus returns to the control that
 * opened it — but only if focus was inside the drawer, and not when the
 * drawer closed because a link navigated (then the new page takes focus).
 */
function useDrawerBehavior(
  open: boolean,
  drawerRef: RefObject<HTMLElement | null>,
  returnFocusRef: RefObject<HTMLButtonElement | null>,
  close: () => void,
): void {
  const { lockScroll, skipFocusReturnRef } = useShellPanels();
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) {
      return;
    }

    const drawer = drawerRef.current;
    const focusables = () =>
      drawer ? [...drawer.querySelectorAll<HTMLElement>(focusableSelector)] : [];
    focusables()[0]?.focus();
    let lastFocused: Element | null = document.activeElement;

    const releaseScroll = lockScroll();

    function handleFocusIn(event: FocusEvent) {
      lastFocused = event.target as Element | null;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Leave Escape to an open menu or dialog inside the drawer.
        if (event.defaultPrevented) {
          return;
        }
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key === "Tab") {
        const items = focusables();
        if (items.length === 0) {
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !drawer?.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !drawer?.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      releaseScroll();

      // `drawer` may already be detached; `contains` still works on it.
      // The backdrop belongs to the drawer: closing by tapping it still returns focus.
      const focusWasInside = Boolean(
        lastFocused &&
        ((drawer && drawer.contains(lastFocused)) || lastFocused.closest("[data-drawer-backdrop]")),
      );
      if (skipFocusReturnRef.current) {
        skipFocusReturnRef.current = false;
        if (focusWasInside) {
          focusNewPage();
        }
        return;
      }
      if (focusWasInside) {
        // The opener is rendered again by the time this cleanup runs.
        returnFocusRef.current?.focus();
      }
    };
  }, [drawerRef, lockScroll, open, returnFocusRef, skipFocusReturnRef]);
}

/** After navigating from a drawer: the new page's heading, else its main. */
function focusNewPage(): void {
  const target =
    document.querySelector<HTMLElement>("main h1") ?? document.querySelector<HTMLElement>("main");
  if (!target) {
    return;
  }
  if (!target.hasAttribute("tabindex")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
}

const toggleSizeClassName = "size-8 pointer-coarse:size-11";

function ShellPanel({ children, headerStart, label, side }: Readonly<ShellPanelProps>) {
  const panels = useShellPanels();
  const isExpanded = side === "left" ? panels.isLeftExpanded : panels.isRightExpanded;
  const toggle = side === "left" ? panels.toggleLeft : panels.toggleRight;
  const collapse = side === "left" ? panels.collapseLeft : panels.collapseRight;
  const openerRef = side === "left" ? panels.leftToggleRef : panels.rightToggleRef;
  const overlay = isOverlaySide(side, panels.tier);
  const { Icon, label: controlLabel } = getPanelControl(side, isExpanded);
  const drawerRef = useRef<HTMLElement>(null);

  useDrawerBehavior(overlay && isExpanded, drawerRef, openerRef, collapse);

  const toggleButton = (
    <Button
      aria-expanded={isExpanded}
      aria-label={controlLabel}
      className={cn("text-muted-foreground hover:text-foreground shrink-0", toggleSizeClassName)}
      onClick={toggle}
      size="icon"
      title={controlLabel}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );

  if (overlay && !isExpanded) {
    // Mobile: the top bar (MobileTopBar) owns the toggles, so nothing floats
    // over the content (UX-10).
    if (panels.tier === "mobile") {
      return null;
    }

    // Tablet: no rail in the flow, just a pinned affordance to reopen it.
    return (
      <div className={cn("fixed top-2 z-40", side === "left" ? "left-2" : "right-2")}>
        <Button
          aria-expanded={false}
          aria-label={controlLabel}
          className={cn(
            "text-muted-foreground hover:text-foreground shrink-0",
            toggleSizeClassName,
          )}
          onClick={toggle}
          ref={openerRef}
          size="icon"
          title={controlLabel}
          type="button"
          variant="ghost"
        >
          <Icon aria-hidden="true" className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {overlay && isExpanded ? (
        <button
          aria-label={`Close ${label}`}
          className="bg-foreground/20 fixed inset-0 z-40"
          data-drawer-backdrop=""
          onClick={collapse}
          type="button"
        />
      ) : null}
      <aside
        aria-label={label}
        // An open drawer is modal (UX-10); in-flow panels stay complementary.
        aria-modal={overlay ? true : undefined}
        ref={drawerRef}
        role={overlay ? "dialog" : undefined}
        className={cn(
          "duration-structural transition-width bg-surface flex flex-col overflow-hidden",
          side === "left" ? "border-r" : "border-l",
          isExpanded ? "ease-out" : "ease-in",
          overlay
            ? cn("fixed inset-y-0 z-50", side === "left" ? "left-0 w-64" : "right-0 w-72")
            : cn("h-svh shrink-0", isExpanded ? (side === "left" ? "w-64" : "w-72") : "w-12"),
        )}
        data-overlay={overlay ? "true" : "false"}
        data-state={isExpanded ? "expanded" : "collapsed"}
      >
        <div
          className={cn(
            "flex h-12 shrink-0 items-center gap-1 px-2",
            side === "left" && "justify-end",
          )}
        >
          {isExpanded && headerStart ? <div className="min-w-0 flex-1">{headerStart}</div> : null}
          {toggleButton}
        </div>
        {isExpanded ? children : null}
      </aside>
    </>
  );
}

export { ShellPanel };
