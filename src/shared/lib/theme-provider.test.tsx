import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "./theme-provider";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock("sonner", () => ({
  toast: { error: toastError },
  Toaster: () => null,
}));

// Mock fetch for the API theme persistence call
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
  } as Response),
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
      <button onClick={() => setTheme("light")}>Set Light</button>
    </div>
  );
}

afterEach(() => {
  vi.mocked(global.fetch).mockImplementation(() => Promise.resolve({ ok: true } as Response));
  toastError.mockReset();
  document.documentElement.classList.remove("dark");
});

describe("ThemeProvider", () => {
  it("initializes with initialTheme and makes it available to child components", () => {
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val")).toHaveTextContent("light");
  });

  it("updates state, toggles document classes, and invokes API call on change", () => {
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>,
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
      }),
    );
  });

  it("toggles html.dark with the preference", () => {
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Dark" }));

    expect(document.documentElement).toHaveClass("dark");
  });

  it("shows no error toast when the preference is saved", async () => {
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Dark" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(toastError).not.toHaveBeenCalled();
  });

  it("toasts when the server rejects the preference, keeping the session theme (UX-09)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Dark" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Couldn't save your theme preference."),
    );
    expect(screen.getByTestId("theme-val")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("toasts when the request fails outright", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Dark" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
  });

  it("lets the last choice win: aborts the previous save, without a toast (UX-09 review)", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(global.fetch).mockImplementation((_url, init) => {
      const signal = init?.signal as AbortSignal;
      signals.push(signal);
      return new Promise<Response>((resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError")),
        );
        setTimeout(() => resolve({ ok: true, status: 204 } as Response), 5);
      });
    });
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Dark" }));
    fireEvent.click(screen.getByRole("button", { name: "Set Light" }));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    expect(vi.mocked(global.fetch).mock.calls.at(-1)?.[1]?.body).toBe(
      JSON.stringify({ preference: "light" }),
    );
    expect(toastError).not.toHaveBeenCalled();
    expect(screen.getByTestId("theme-val")).toHaveTextContent("light");
  });

  it("ignores a stale failure that lands after a newer save", async () => {
    let failFirst!: () => void;
    vi.mocked(global.fetch)
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            failFirst = () => resolve({ ok: false, status: 500 } as Response);
          }),
      )
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response);
    render(
      <ThemeProvider initialTheme="light">
        <TestComponent />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Dark" }));
    fireEvent.click(screen.getByRole("button", { name: "Set Light" }));
    failFirst();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(toastError).not.toHaveBeenCalled();
  });
});
