import type { ReactNode } from "react";

import { signOut } from "@/features/auth/sign-out";

import { CommandHandlersProvider } from "../commands/command-handlers";
import { QuickOpenStateProvider } from "../overlays/quick-open-state";
import { ShortcutProvider } from "../shortcuts/shortcut-manager";
import { AccountMenu } from "./account-menu";
import { CommandPalette } from "./command-palette";
import { MobileTopBar } from "./mobile-top-bar";
import { NoteContextPanel } from "./note-context-panel";
import { ShellPanel } from "./shell-panel";
import { CloseDrawersOnNavigation, ShellPanelsProvider } from "./shell-panels-context";
import { ShellShortcuts } from "./shell-shortcuts";
import { SidebarNavigation } from "./sidebar-navigation";

interface AppShellProps {
  children: ReactNode;
  /** Signed-in identity for the account menu (UX-04); read by the app layout. */
  account?: { displayName: string | null; email: string | null };
  /** Primary "New note" action, injected at the app layer. */
  sidebarNewNote?: ReactNode;
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
  /** Mobile top-bar actions (the New note icon button, UX-10), injected at the app layer. */
  mobileActions?: ReactNode;
  /** Feature dialogs driven by shell state (⌘P quick-open, SRCH-07), injected at the app layer. */
  overlays?: ReactNode;
}

function AppShell({
  account,
  children,
  contextPanel,
  mobileActions,
  overlays,
  sidebarDaily,
  sidebarFolders,
  sidebarNewNote,
  sidebarNotes,
  sidebarTags,
}: Readonly<AppShellProps>) {
  return (
    <ShortcutProvider>
      <CommandHandlersProvider>
        <ShellPanelsProvider>
          <QuickOpenStateProvider>
            <div className="bg-background flex min-h-svh w-full overflow-hidden">
              <ShellShortcuts />
              <CloseDrawersOnNavigation />
              <CommandPalette />
              <ShellPanel
                headerStart={
                  <AccountMenu
                    displayName={account?.displayName ?? null}
                    email={account?.email ?? null}
                    signOutAction={signOut}
                  />
                }
                label="Application sidebar"
                side="left"
              >
                <SidebarNavigation
                  dailySlot={sidebarDaily}
                  foldersSlot={sidebarFolders}
                  newNoteSlot={sidebarNewNote}
                  notesSlot={sidebarNotes}
                  tagsSlot={sidebarTags}
                />
              </ShellPanel>
              <main className="min-w-0 flex-1 overflow-auto">
                <MobileTopBar actions={mobileActions} />
                {children}
              </main>
              <NoteContextPanel>{contextPanel}</NoteContextPanel>
            </div>
            {overlays}
          </QuickOpenStateProvider>
        </ShellPanelsProvider>
      </CommandHandlersProvider>
    </ShortcutProvider>
  );
}

export { AppShell };
