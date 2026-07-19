import type { ReactNode } from "react";

import { AppShell } from "@/features/shell/components/app-shell";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: Readonly<AppLayoutProps>) {
  return <AppShell>{children}</AppShell>;
}
