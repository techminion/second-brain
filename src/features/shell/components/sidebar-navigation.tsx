import { CalendarDays, Folder, LogOut, type LucideIcon, Settings, Tags } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";

interface SidebarNavigationProps {
  signOutAction: () => Promise<void>;
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
export function SidebarNavigation({ signOutAction }: Readonly<SidebarNavigationProps>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Knowledge navigation" className="flex min-h-0 flex-1 flex-col gap-1 px-2">
        <NavigationSection Icon={CalendarDays} label="Daily note" />
        <NavigationSection Icon={Folder} label="Folders" />
        <NavigationSection Icon={Tags} label="Tags" />
      </nav>
      <div className="flex flex-col gap-1 border-t p-2">
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
