import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeSelector } from "./theme-selector";

const setTheme = vi.fn();
let theme = "system";

vi.mock("@/shared/lib/theme-provider", () => ({
  useTheme: () => ({ setTheme, theme }),
}));

afterEach(() => {
  setTheme.mockReset();
  theme = "system";
});

describe("ThemeSelector (UX-09)", () => {
  it("renders a Theme radio group with Light, Dark and System", () => {
    render(<ThemeSelector />);

    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    for (const name of ["Light", "Dark", "System"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
  });

  it("checks the provider's current preference", () => {
    theme = "dark";
    render(<ThemeSelector />);

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "System" })).not.toBeChecked();
  });

  it("defaults to System", () => {
    render(<ThemeSelector />);

    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  });

  it("calls setTheme when an option is chosen", () => {
    render(<ThemeSelector />);

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("is one native radio group, so the arrow keys move the selection", () => {
    render(<ThemeSelector />);

    const radios = screen.getAllByRole("radio");
    // Browsers move focus and selection between radios that share a name;
    // jsdom does not simulate that, so assert the shared group instead.
    expect(new Set(radios.map((radio) => radio.getAttribute("name")))).toEqual(new Set(["theme"]));
    radios[0].focus();
    expect(radios[0]).toHaveFocus();
  });
});
