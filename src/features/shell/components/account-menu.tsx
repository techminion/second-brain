"use client";

import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface AccountMenuProps {
  displayName: string | null;
  email: string | null;
  signOutAction: () => Promise<void>;
}

const itemClass =
  "hover:bg-muted focus:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none";

/**
 * The sidebar's account menu (UX-04, Linear/Notion style): who is signed in,
 * Settings, and Log out — so the navigation rows stay about knowledge, not
 * account chores. Log out submits the server action (ADR-20) through a form
 * that lives outside the menu.
 */
export function AccountMenu({ displayName, email, signOutAction }: AccountMenuProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const name = displayName?.trim() || email || "Account";
  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      <form action={signOutAction} hidden ref={formRef} />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Account: ${name}`}
          className="hover:bg-muted focus-visible:ring-ring flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-1.5 text-sm outline-none focus-visible:ring-2"
        >
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-left font-medium">{name}</span>
          <ChevronsUpDown aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            align="start"
            className="bg-popover text-popover-foreground z-50 min-w-56 rounded-lg border p-1 shadow-md"
          >
            {email ? (
              <DropdownMenuLabel className="text-muted-foreground truncate px-2 py-1.5 text-xs">
                {email}
              </DropdownMenuLabel>
            ) : null}
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/settings">
                <Settings aria-hidden="true" className="text-muted-foreground size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border my-1 h-px" />
            <DropdownMenuItem
              className={itemClass}
              // The menu unmounts its items on select, before a native submit
              // from inside it would run, so submit the outer form directly.
              onSelect={() => formRef.current?.requestSubmit()}
            >
              <LogOut aria-hidden="true" className="text-muted-foreground size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </>
  );
}
