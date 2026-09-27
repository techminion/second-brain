import {
  CalendarDays,
  Folder,
  LogOut,
  type LucideIcon,
  Settings,
  Tags,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/shared/ui/button";

interface SidebarNavigationProps {
  signOutAction: () => Promise<void>;
  /** Note list slot, composed at the app layer so the shell stays feature-agnostic. */
  notesSlot?: ReactNode;
  /** Daily-note section slot (DAILY-03/04); the static heading renders without it. */
  dailySlot?: ReactNode;
  /** Folder tree slot (FOLD-06); the static heading renders without it. */
  foldersSlot?: ReactNode;
  /** Tags section slot (TAG-07); the static heading renders without it. */
  tagsSlot?: ReactNode;
}

interface NavigationSectionProps {
  Icon: LucideIcon;
  label: string;
}

function NavigationSection({ Icon, label }: Readonly<NavigationSectionProps>) {
  return (
    <section aria-labelledby={`sidebar-${label.toLowerCase().replace(" ", "-")}`}>
      <h2
        className="text-muted-foreground flex h-9 items-center gap-2 px-2 text-sm font-medium"
        id={`sidebar-${label.toLowerCase().replace(" ", "-")}`}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {label}
      </h2>
    </section>
  );
}

/**
 * Navigation frame only (SHELL-03): later feature tasks populate the folder
 * tree, tag list, and daily-note destination. The specs do not define route
 * paths yet, so this frame deliberately avoids dead/invented links.
 */
export function SidebarNavigation({
  dailySlot,
  foldersSlot,
  notesSlot,
  signOutAction,
  tagsSlot,
}: Readonly<SidebarNavigationProps>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Knowledge navigation" className="flex flex-col gap-1 px-2 pt-2">
        {dailySlot ?? <NavigationSection Icon={CalendarDays} label="Daily note" />}
        {foldersSlot ?? <NavigationSection Icon={Folder} label="Folders" />}
        {tagsSlot ?? <NavigationSection Icon={Tags} label="Tags" />}
      </nav>
      {notesSlot}
      <div className="mt-auto flex flex-col gap-1 border-t p-2">
        <Button asChild className="w-full justify-start" variant="ghost">
          <Link href="/trash">
            <Trash2 aria-hidden="true" className="size-4" />
            Trash
          </Link>
        </Button>
        <Button asChild className="w-full justify-start" variant="ghost">
          <Link href="/settings">
            <Settings aria-hidden="true" className="size-4" />
            Settings
          </Link>
        </Button>
        <form action={signOutAction}>
          <Button className="w-full justify-start" type="submit" variant="ghost">
            <LogOut aria-hidden="true" className="size-4" />
            Log out
          </Button>
        </form>
      </div>
    </div>
  );
}
