"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Toaster } from "sonner";

import { resolveTheme, type ThemePreference } from "./theme";

interface ThemeContextType {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme: ThemePreference;
}

/**
 * ThemeProvider provides the client-side state for theme overrides (light, dark, system).
 * Coordinates with the backend cookie-based override strategy by posting to /api/theme.
 */
export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);

  const setTheme = (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle("dark", resolveTheme(newTheme));

    // Call route handler to store the preference in a HttpOnly cookie (ADR-9)
    fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preference: newTheme }),
    }).catch((err) => {
      console.error("Failed to persist theme preference cookie:", err);
    });
  };

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      document.documentElement.classList.toggle("dark", resolveTheme("system"));
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      <Toaster theme={theme} closeButton position="bottom-right" />
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access and mutate the current theme preference.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
