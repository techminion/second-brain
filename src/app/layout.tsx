import "./globals.css";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import {
  getThemeScript,
  isThemePreference,
  themeCookieName,
  type ThemePreference,
} from "@/shared/lib/theme";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "An AI-native knowledge operating system.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ children }: Readonly<RootLayoutProps>) {
  const storedPreference = (await cookies()).get(themeCookieName)?.value;
  const themePreference: ThemePreference = isThemePreference(storedPreference)
    ? storedPreference
    : "system";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeScript(themePreference) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
