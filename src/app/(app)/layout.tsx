import type { ReactNode } from "react";

import { FolderTree } from "@/features/folders/components/folder-tree";
import { BacklinksPanel } from "@/features/notes/components/backlinks-panel";
import { DailyNoteNavigation } from "@/features/notes/components/daily-note-navigation";
import { NewNoteButton } from "@/features/notes/components/new-note-button";
import { NewNoteCommand } from "@/features/notes/components/new-note-command";
import { SidebarNoteList } from "@/features/notes/components/sidebar-note-list";
import { QuickOpen } from "@/features/search/components/quick-open";
import { SidebarTagList } from "@/features/search/components/sidebar-tag-list";
import { AppShell } from "@/features/shell/components/app-shell";
import { createUserService } from "@/features/user/user-service";
import { createServerActionSupabaseClient } from "@/shared/lib/supabase-server-action-client";

interface AppLayoutProps {
  children: ReactNode;
}

/** Signed-in identity for the sidebar account menu; the shell renders without it. */
async function loadAccount(): Promise<{ displayName: string | null; email: string } | undefined> {
  try {
    const client = await createServerActionSupabaseClient();
    const { data } = await client.auth.getClaims();
    const userId = data?.claims.sub;
    if (typeof userId !== "string") {
      return undefined;
    }
    const profile = await (await createUserService()).getProfile(userId);
    return { displayName: profile.displayName, email: profile.email };
  } catch {
    return undefined;
  }
}

export default async function AppLayout({ children }: Readonly<AppLayoutProps>) {
  const account = await loadAccount();

  return (
    <AppShell
      account={account}
      contextPanel={<BacklinksPanel />}
      overlays={
        <>
          <QuickOpen />
          <NewNoteCommand />
        </>
      }
      sidebarDaily={<DailyNoteNavigation />}
      sidebarFolders={<FolderTree />}
      sidebarNewNote={<NewNoteButton />}
      sidebarNotes={<SidebarNoteList />}
      sidebarTags={<SidebarTagList />}
    >
      {children}
    </AppShell>
  );
}
