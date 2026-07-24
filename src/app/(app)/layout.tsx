import type { ReactNode } from "react";

import { SidebarNoteList } from "@/features/notes/components/sidebar-note-list";
import { AppShell } from "@/features/shell/components/app-shell";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: Readonly<AppLayoutProps>) {
  return <AppShell sidebarNotes={<SidebarNoteList />}>{children}</AppShell>;
}
