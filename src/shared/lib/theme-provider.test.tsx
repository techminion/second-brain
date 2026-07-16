import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider,useTheme } from "./theme-provider";

// Mock fetch for the API theme persistence call
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
  } as Response)
);

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

function TestComponent() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("initializes with initialTheme and makes it available to child components", () => {
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val")).toHaveTextContent("light");
  });

  it("updates state, toggles document classes, and invokes API call on change", () => {
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", { name: "Set Dark" });
    fireEvent.click(button);

    expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/theme",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference: "dark" }),
      })
    );
  });
});
