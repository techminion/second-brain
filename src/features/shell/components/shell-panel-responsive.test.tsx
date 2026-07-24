import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BreakpointTier } from "../hooks/use-breakpoint-tier";
import { ShellPanel } from "./shell-panel";
import { ShellPanelsProvider } from "./shell-panels-context";

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

function renderShell() {
  return render(
    <ShellPanelsProvider>
      <ShellPanel label="Application sidebar" side="left" />
      <ShellPanel label="Context panel" side="right" />
    </ShellPanelsProvider>,
  );
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("ShellPanel responsive behavior (SHELL-06)", () => {
  it("keeps both panels in-flow and expanded on desktop", () => {
    installMatchMedia("desktop");
    renderShell();

    const sidebar = screen.getByRole("complementary", { name: "Application sidebar" });
    const contextPanel = screen.getByRole("complementary", { name: "Context panel" });

    expect(sidebar).toHaveAttribute("data-overlay", "false");
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(contextPanel).toHaveAttribute("data-overlay", "false");
    expect(contextPanel).toHaveAttribute("data-state", "expanded");
  });

  it("collapses the sidebar in-flow and makes the right panel a closed overlay on tablet", () => {
    installMatchMedia("tablet");
    renderShell();

    const sidebar = screen.getByRole("complementary", { name: "Application sidebar" });
    expect(sidebar).toHaveAttribute("data-overlay", "false");
    expect(sidebar).toHaveAttribute("data-state", "collapsed");

    // The right panel is a closed overlay: no in-flow aside, just a reopen affordance.
    expect(screen.queryByRole("complementary", { name: "Context panel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand context panel" })).toBeInTheDocument();
  });

  it("renders both panels as closed drawers on mobile", () => {
    installMatchMedia("mobile");
    renderShell();

    expect(
      screen.queryByRole("complementary", { name: "Application sidebar" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Context panel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand application sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand context panel" })).toBeInTheDocument();
  });

  it("opens a mobile drawer with a backdrop and closes it on backdrop click", () => {
    installMatchMedia("mobile");
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Expand application sidebar" }));

    const sidebar = screen.getByRole("complementary", { name: "Application sidebar" });
    expect(sidebar).toHaveAttribute("data-overlay", "true");
    expect(sidebar).toHaveAttribute("data-state", "expanded");

    const backdrop = screen.getByRole("button", { name: "Close Application sidebar" });
    fireEvent.click(backdrop);

    expect(
      screen.queryByRole("complementary", { name: "Application sidebar" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand application sidebar" })).toBeInTheDocument();
  });
});
