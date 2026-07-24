"use client";

import {
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

import type { BreakpointTier } from "../hooks/use-breakpoint-tier";
import { useShellPanels } from "./shell-panels-context";

type ShellPanelSide = "left" | "right";

interface ShellPanelProps {
  children?: ReactNode;
  label: string;
  side: ShellPanelSide;
}

interface PanelControl {
  Icon: LucideIcon;
  label: string;
}

function getPanelControl(side: ShellPanelSide, isExpanded: boolean): PanelControl {
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

function ShellPanel({ children, label, side }: Readonly<ShellPanelProps>) {
  const panels = useShellPanels();
  const isExpanded = side === "left" ? panels.isLeftExpanded : panels.isRightExpanded;
  const toggle = side === "left" ? panels.toggleLeft : panels.toggleRight;
  const collapse = side === "left" ? panels.collapseLeft : panels.collapseRight;
  const overlay = isOverlaySide(side, panels.tier);
  const { Icon, label: controlLabel } = getPanelControl(side, isExpanded);

  const toggleButton = (
    <Button
      aria-expanded={isExpanded}
      aria-label={controlLabel}
      className="text-muted-foreground hover:text-foreground size-8 shrink-0"
      onClick={toggle}
      size="icon"
      title={controlLabel}
      type="button"
      variant="ghost"
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );

  // Collapsed drawer: no rail in the flow, just a pinned affordance to reopen it
  // (there is no visible rail to click at this tier).
  if (overlay && !isExpanded) {
    return (
      <div className={cn("fixed top-2 z-40", side === "left" ? "left-2" : "right-2")}>
        {toggleButton}
      </div>
    );
  }

  return (
    <>
      {overlay && isExpanded ? (
        <button
          aria-label={`Close ${label}`}
          className="bg-foreground/20 fixed inset-0 z-40"
          onClick={collapse}
          type="button"
        />
      ) : null}
      <aside
        aria-label={label}
        className={cn(
          "duration-structural transition-width bg-muted/30 flex flex-col overflow-hidden",
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
          className={cn("flex h-12 shrink-0 items-center px-2", side === "left" && "justify-end")}
        >
          {toggleButton}
        </div>
        {isExpanded ? children : null}
      </aside>
    </>
  );
}

export { ShellPanel };
