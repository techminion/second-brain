import type { ReactNode } from "react";

import { signOut } from "@/features/auth/sign-out";

import { ShortcutProvider } from "../shortcuts/shortcut-manager";
import { CommandPalette } from "./command-palette";
import { ShellPanel } from "./shell-panel";
import { ShellPanelsProvider } from "./shell-panels-context";
import { ShellShortcuts } from "./shell-shortcuts";
import { SidebarNavigation } from "./sidebar-navigation";

interface AppShellProps {
  children: ReactNode;
}

function AppShell({ children }: Readonly<AppShellProps>) {
  return (
    <ShortcutProvider>
      <ShellPanelsProvider>
        <div className="bg-background flex min-h-svh w-full overflow-hidden">
          <ShellShortcuts />
          <CommandPalette />
          <ShellPanel label="Application sidebar" side="left">
            <SidebarNavigation signOutAction={signOut} />
          </ShellPanel>
          <main className="min-w-0 flex-1 overflow-auto">{children}</main>
          <ShellPanel label="Context panel" side="right" />
        </div>
      </ShellPanelsProvider>
    </ShortcutProvider>
  );
}

export { AppShell };
