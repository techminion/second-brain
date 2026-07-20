import type { ReactNode } from "react";

import { signOut } from "@/features/auth/sign-out";

import { ShellPanel } from "./shell-panel";
import { SidebarNavigation } from "./sidebar-navigation";

interface AppShellProps {
  children: ReactNode;
}

function AppShell({ children }: Readonly<AppShellProps>) {
  return (
    <div className="bg-background flex min-h-svh w-full overflow-hidden">
      <ShellPanel label="Application sidebar" side="left">
        <SidebarNavigation signOutAction={signOut} />
      </ShellPanel>
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      <ShellPanel label="Context panel" side="right" />
    </div>
  );
}

export { AppShell };
