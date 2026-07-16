export const themeCookieName = "second-brain-theme";

export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];

export function isThemePreference(value: string | undefined): value is ThemePreference {
  return themePreferences.some((preference) => preference === value);
}

export function getThemeScript(preference: ThemePreference) {
  return `(() => {
    const preference = ${JSON.stringify(preference)};
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = preference === "dark" || (preference === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  })();`;
}

export function resolveTheme(preference: ThemePreference): boolean {
  if (typeof window === "undefined") return false;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return preference === "dark" || (preference === "system" && prefersDark);
}
