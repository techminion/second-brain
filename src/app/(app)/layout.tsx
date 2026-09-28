import type { ReactNode } from "react";

import { FolderTree } from "@/features/folders/components/folder-tree";
import { BacklinksPanel } from "@/features/notes/components/backlinks-panel";
import { DailyNoteNavigation } from "@/features/notes/components/daily-note-navigation";
import { SidebarNoteList } from "@/features/notes/components/sidebar-note-list";
import { QuickOpen } from "@/features/search/components/quick-open";
import { SidebarTagList } from "@/features/search/components/sidebar-tag-list";
import { AppShell } from "@/features/shell/components/app-shell";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: Readonly<AppLayoutProps>) {
  return (
    <AppShell
      contextPanel={<BacklinksPanel />}
      overlays={<QuickOpen />}
      sidebarDaily={<DailyNoteNavigation />}
      sidebarFolders={<FolderTree />}
      sidebarNotes={<SidebarNoteList />}
      sidebarTags={<SidebarTagList />}
    >
      {children}
    </AppShell>
  );
}
