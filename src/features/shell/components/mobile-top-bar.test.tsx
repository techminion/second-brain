import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BreakpointTier } from "../hooks/use-breakpoint-tier";
import { MobileTopBar } from "./mobile-top-bar";
import { ShellPanelsProvider } from "./shell-panels-context";

let pathname = "/";

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function installMatchMedia(tier: BreakpointTier): void {
  window.matchMedia = vi.fn((query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: query.includes("1280px") ? tier === "desktop" : tier === "tablet",
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function renderBar() {
  return render(
    <ShellPanelsProvider>
      <MobileTopBar actions={<button type="button">New note</button>} />
    </ShellPanelsProvider>,
  );
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  pathname = "/";
});

describe("MobileTopBar (UX-10)", () => {
  it.each<BreakpointTier>(["desktop", "tablet"])("renders nothing on %s", (tier) => {
    installMatchMedia(tier);
    renderBar();

    expect(screen.queryByRole("region", { name: "Top bar" })).not.toBeInTheDocument();
  });

  it("renders the sidebar toggle and the injected New note action on mobile", () => {
    installMatchMedia("mobile");
    renderBar();

    const bar = screen.getByRole("region", { name: "Top bar" });
    const toggle = within(bar).getByRole("button", { name: "Expand application sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveClass("pointer-coarse:size-11");
    expect(bar).toHaveClass("h-12", "sticky");
    expect(within(bar).getByRole("button", { name: "New note" })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(
      within(bar).getByRole("button", { name: "Collapse application sidebar" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the context-panel toggle only on note routes", () => {
    installMatchMedia("mobile");
    const view = renderBar();
    expect(screen.queryByRole("button", { name: /context panel/ })).not.toBeInTheDocument();

    pathname = "/notes/n1";
    view.rerender(
      <ShellPanelsProvider>
        <MobileTopBar />
      </ShellPanelsProvider>,
    );
    expect(screen.getByRole("button", { name: "Expand context panel" })).toBeInTheDocument();
  });
});
