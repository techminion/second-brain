"use client";

import type { LucideIcon } from "lucide-react";
import { Monitor, Moon, Sun } from "lucide-react";

import type { ThemePreference } from "@/shared/lib/theme";
import { useTheme } from "@/shared/lib/theme-provider";
import { cn } from "@/shared/lib/utils";

const options: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { Icon: Sun, label: "Light", value: "light" },
  { Icon: Moon, label: "Dark", value: "dark" },
  { Icon: Monitor, label: "System", value: "system" },
];

/**
 * Light / Dark / System theme choice (UX-09). Native radios sharing one name,
 * so Tab enters the group and the arrow keys move the selection; the change
 * applies immediately and persists in the ADR-9 cookie via `setTheme`.
 */
export function ThemeSelector() {
  const { setTheme, theme } = useTheme();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium" id="theme-label">
        Theme
      </span>
      <div aria-labelledby="theme-label" className="grid grid-cols-3 gap-2" role="radiogroup">
        {options.map(({ Icon, label, value }) => {
          const checked = theme === value;
          return (
            <label
              className={cn(
                "text-foreground hover:bg-muted flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm",
                "has-focus-visible:ring-ring has-focus-visible:ring-2",
                checked && "border-primary ring-primary ring-1",
              )}
              key={value}
            >
              <input
                checked={checked}
                className="sr-only"
                name="theme"
                onChange={() => setTheme(value)}
                type="radio"
                value={value}
              />
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
