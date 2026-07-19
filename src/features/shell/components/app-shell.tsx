import type { ReactNode } from "react";

import { ShellPanel } from "./shell-panel";

interface AppShellProps {
  children: ReactNode;
}

function AppShell({ children }: Readonly<AppShellProps>) {
  return (
    <div className="bg-background flex min-h-svh w-full overflow-hidden">
      <ShellPanel label="Application sidebar" side="left" />
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      <ShellPanel label="Context panel" side="right" />
    </div>
  );
}

export { AppShell };
