import type { ReactNode } from "react";

import { signOut } from "@/features/auth/sign-out";

import { QuickOpenStateProvider } from "../overlays/quick-open-state";
import { ShortcutProvider } from "../shortcuts/shortcut-manager";
import { CommandPalette } from "./command-palette";
import { ShellPanel } from "./shell-panel";
import { ShellPanelsProvider } from "./shell-panels-context";
import { ShellShortcuts } from "./shell-shortcuts";
import { SidebarNavigation } from "./sidebar-navigation";

interface AppShellProps {
  children: ReactNode;
  /** Sidebar note list, injected at the app layer to keep the shell feature-agnostic. */
  sidebarNotes?: ReactNode;
  /** Sidebar daily-note section, injected at the app layer like `sidebarNotes`. */
  sidebarDaily?: ReactNode;
  /** Sidebar folder tree, injected at the app layer. */
  sidebarFolders?: ReactNode;
  /** Sidebar tags section, injected at the app layer. */
  sidebarTags?: ReactNode;
  /** Right context panel content (backlinks, BACK-03), injected at the app layer. */
  contextPanel?: ReactNode;
  /** Feature dialogs driven by shell state (⌘P quick-open, SRCH-07), injected at the app layer. */
  overlays?: ReactNode;
}

function AppShell({
  children,
  contextPanel,
  overlays,
  sidebarDaily,
  sidebarFolders,
  sidebarNotes,
  sidebarTags,
}: Readonly<AppShellProps>) {
  return (
    <ShortcutProvider>
      <ShellPanelsProvider>
        <QuickOpenStateProvider>
          <div className="bg-background flex min-h-svh w-full overflow-hidden">
            <ShellShortcuts />
            <CommandPalette />
            <ShellPanel label="Application sidebar" side="left">
              <SidebarNavigation
                dailySlot={sidebarDaily}
                foldersSlot={sidebarFolders}
                notesSlot={sidebarNotes}
                tagsSlot={sidebarTags}
                signOutAction={signOut}
              />
            </ShellPanel>
            <main className="min-w-0 flex-1 overflow-auto">{children}</main>
            <ShellPanel label="Context panel" side="right">
              {contextPanel}
            </ShellPanel>
          </div>
          {overlays}
        </QuickOpenStateProvider>
      </ShellPanelsProvider>
    </ShortcutProvider>
  );
}

export { AppShell };
