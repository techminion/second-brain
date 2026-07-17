import "./globals.css";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { QueryProvider } from "@/shared/lib/query-provider";
import {
  getThemeScript,
  isThemePreference,
  themeCookieName,
  type ThemePreference,
} from "@/shared/lib/theme";
import { ThemeProvider } from "@/shared/lib/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeScript(themePreference) }} />
      </head>
      <body>
        <ThemeProvider initialTheme={themePreference}>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
