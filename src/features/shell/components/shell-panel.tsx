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

function ShellPanel({ children, label, side }: Readonly<ShellPanelProps>) {
  const panels = useShellPanels();
  const isExpanded = side === "left" ? panels.isLeftExpanded : panels.isRightExpanded;
  const toggle = side === "left" ? panels.toggleLeft : panels.toggleRight;
  const { Icon, label: controlLabel } = getPanelControl(side, isExpanded);

  return (
    <aside
      aria-label={label}
      className={cn(
        "duration-structural transition-width bg-muted/30 flex h-svh shrink-0 flex-col overflow-hidden",
        side === "left" ? "border-r" : "border-l",
        isExpanded ? (side === "left" ? "w-64" : "w-72") : "w-12",
        isExpanded ? "ease-out" : "ease-in",
      )}
      data-state={isExpanded ? "expanded" : "collapsed"}
    >
      <div className={cn("flex h-12 shrink-0 items-center px-2", side === "left" && "justify-end")}>
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
      </div>
      {isExpanded ? children : null}
    </aside>
  );
}

export { ShellPanel };
