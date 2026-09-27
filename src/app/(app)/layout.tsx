import type { ReactNode } from "react";

import { DailyNoteNavigation } from "@/features/notes/components/daily-note-navigation";
import { SidebarNoteList } from "@/features/notes/components/sidebar-note-list";
import { AppShell } from "@/features/shell/components/app-shell";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: Readonly<AppLayoutProps>) {
  return (
    <AppShell sidebarDaily={<DailyNoteNavigation />} sidebarNotes={<SidebarNoteList />}>
      {children}
    </AppShell>
  );
}
