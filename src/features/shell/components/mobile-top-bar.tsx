"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

import { hasNoteContextPanel } from "./note-context-panel";
import { getPanelControl } from "./shell-panel";
import { useShellPanels } from "./shell-panels-context";

const iconButtonClassName =
  "text-muted-foreground hover:text-foreground size-9 shrink-0 pointer-coarse:size-11";

/**
 * The mobile-tier top bar (UX-10, 10_DESIGN §11): a 48px sticky row at the
 * top of the content with the sidebar toggle, an optional title, the injected
 * actions (New note) and, on note routes, the context-panel toggle. It
 * replaces the floating drawer toggles, which overlapped the note header.
 * Renders nothing on tablet and desktop.
 */
export function MobileTopBar({
  actions,
  title,
}: Readonly<{ actions?: ReactNode; title?: ReactNode }>) {
  const panels = useShellPanels();
  const pathname = usePathname();

  if (panels.tier !== "mobile") {
    return null;
  }

  const left = getPanelControl("left", panels.isLeftExpanded);
  const right = getPanelControl("right", panels.isRightExpanded);

  return (
    <section
      aria-label="Top bar"
      className="bg-background sticky top-0 z-30 flex h-12 shrink-0 items-center gap-1 border-b px-2"
    >
      <Button
        aria-expanded={panels.isLeftExpanded}
        aria-label={left.label}
        className={iconButtonClassName}
        onClick={panels.toggleLeft}
        ref={panels.leftToggleRef}
        size="icon"
        title={left.label}
        type="button"
        variant="ghost"
      >
        <left.Icon aria-hidden="true" className="size-4" />
      </Button>
      <div className={cn("min-w-0 flex-1 truncate text-sm font-medium")}>{title}</div>
      {actions}
      {hasNoteContextPanel(pathname) ? (
        <Button
          aria-expanded={panels.isRightExpanded}
          aria-label={right.label}
          className={iconButtonClassName}
          onClick={panels.toggleRight}
          ref={panels.rightToggleRef}
          size="icon"
          title={right.label}
          type="button"
          variant="ghost"
        >
          <right.Icon aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </section>
  );
}
