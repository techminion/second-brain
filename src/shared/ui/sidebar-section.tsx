"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { type HTMLAttributes, type ReactNode, useEffect, useId, useState } from "react";

import { cn } from "@/shared/lib/utils";

interface SidebarSectionProps {
  /** Heading id; list landmarks inside the section reference it. */
  id: string;
  title: string;
  Icon: LucideIcon;
  children: ReactNode;
  /** Header-row actions (e.g. "New folder"), always reachable when collapsed too. */
  actions?: ReactNode;
  /** Extra props on the header row, e.g. drop targets (FOLD-08). */
  headerProps?: HTMLAttributes<HTMLDivElement>;
}

/** Shared look for sidebar rows (links and buttons) across features (UX-04). */
export const sidebarItemClassName =
  "text-foreground hover:bg-muted focus-visible:ring-ring data-active:bg-muted flex h-8 items-center gap-2 rounded-md px-2 text-sm outline-none focus-visible:ring-2";

const storagePrefix = "sidebar-section:";

function readStoredOpen(id: string): boolean | null {
  try {
    const stored = window.localStorage.getItem(storagePrefix + id);
    return stored === null ? null : stored === "open";
  } catch {
    return null;
  }
}

function storeOpen(id: string, open: boolean) {
  try {
    window.localStorage.setItem(storagePrefix + id, open ? "open" : "closed");
  } catch {
    // Storage unavailable (private mode): the section still toggles for this page.
  }
}

/**
 * A collapsible sidebar section (UX-04): the heading is a disclosure button,
 * so a long folder tree or note list can fold away (Linear/Notion style).
 * Open by default; the choice is remembered per section in this browser only.
 */
export function SidebarSection({
  actions,
  children,
  headerProps,
  Icon,
  id,
  title,
}: SidebarSectionProps) {
  const regionId = useId();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = readStoredOpen(id);
    if (stored !== null) {
      setOpen(stored);
    }
  }, [id]);

  const toggle = () => {
    setOpen((current) => {
      storeOpen(id, !current);
      return !current;
    });
  };

  return (
    <section aria-labelledby={id} className="flex flex-col gap-0.5">
      <div
        {...headerProps}
        className={cn(
          "group flex h-8 items-center justify-between rounded-md pr-1",
          headerProps?.className,
        )}
      >
        <h2 className="min-w-0 flex-1" id={id}>
          <button
            aria-controls={regionId}
            aria-expanded={open}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold tracking-wide uppercase outline-none focus-visible:ring-2"
            onClick={toggle}
            type="button"
          >
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{title}</span>
            <ChevronRight
              aria-hidden="true"
              className={cn(
                "duration-micro size-3 shrink-0 transition-transform",
                open && "rotate-90",
              )}
            />
          </button>
        </h2>
        {actions}
      </div>
      <div hidden={!open} id={regionId}>
        {children}
      </div>
    </section>
  );
}
