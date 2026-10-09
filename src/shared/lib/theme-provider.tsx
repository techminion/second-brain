"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";

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
  // The last choice wins (UX-09 review): arrowing through the radios fires one
  // save per step, so each save aborts the one before it, and a response that
  // isn't from the latest save is ignored.
  const pendingSave = useRef<AbortController | null>(null);

  const setTheme = (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle("dark", resolveTheme(newTheme));

    // Call route handler to store the preference in a HttpOnly cookie (ADR-9).
    // `fetch` resolves on 4xx/5xx, so a non-ok response is a failure too
    // (UX-09); the theme still applies for this session either way.
    pendingSave.current?.abort();
    const controller = new AbortController();
    pendingSave.current = controller;

    fetch("/api/theme", {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preference: newTheme }),
    })
      .then((response) => {
        if (pendingSave.current !== controller) {
          return;
        }
        if (!response.ok) {
          throw new Error(`Theme preference not saved (HTTP ${response.status})`);
        }
      })
      .catch((err: unknown) => {
        // A superseded save is not a failure: a newer one is on its way.
        if (controller.signal.aborted || pendingSave.current !== controller) {
          return;
        }
        console.error("Failed to persist theme preference cookie:", err);
        toast.error("Couldn't save your theme preference.");
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
