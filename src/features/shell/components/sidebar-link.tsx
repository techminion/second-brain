"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { sidebarItemClassName } from "@/shared/ui/sidebar-section";

interface SidebarLinkProps {
  href: string;
  Icon: LucideIcon;
  children: ReactNode;
  /** Keyboard hint shown at the row's end, e.g. ⇧⌘F. */
  shortcut?: string;
}

/** A primary sidebar destination (UX-04), marked current on its own route. */
export function SidebarLink({ children, href, Icon, shortcut }: SidebarLinkProps) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      aria-current={current ? "page" : undefined}
      className={sidebarItemClassName}
      data-active={current ? "" : undefined}
      href={href}
    >
      <Icon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
      {children}
      {shortcut ? (
        <kbd className="text-muted-foreground ml-auto font-sans text-xs">{shortcut}</kbd>
      ) : null}
    </Link>
  );
}
