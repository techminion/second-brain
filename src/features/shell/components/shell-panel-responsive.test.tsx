import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BreakpointTier } from "../hooks/use-breakpoint-tier";
import { MobileTopBar } from "./mobile-top-bar";
import { ShellPanel } from "./shell-panel";
import { CloseDrawersOnNavigation, ShellPanelsProvider } from "./shell-panels-context";

let pathname = "/notes/n1";

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

function renderShell() {
  return render(
    <ShellPanelsProvider>
      <ShellPanel label="Application sidebar" side="left" />
      <ShellPanel label="Context panel" side="right" />
    </ShellPanelsProvider>,
  );
}

function mobileShell() {
  return (
    <ShellPanelsProvider>
      <CloseDrawersOnNavigation />
      <ShellPanel label="Application sidebar" side="left">
        <a href="/x">Inside link</a>
      </ShellPanel>
      <main>
        <MobileTopBar />
      </main>
    </ShellPanelsProvider>
  );
}

function renderMobileShell() {
  return render(mobileShell());
}

function topBarToggle() {
  return within(screen.getByRole("region", { name: "Top bar" })).getByRole("button", {
    name: /application sidebar/,
  });
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  pathname = "/notes/n1";
  document.body.style.overflow = "";
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

  it("renders no panels or floating toggles on mobile, where the top bar owns them (UX-10)", () => {
    installMatchMedia("mobile");
    renderShell();

    expect(
      screen.queryByRole("complementary", { name: "Application sidebar" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Expand/ })).not.toBeInTheDocument();
  });

  it("opens a mobile drawer from the top bar as a modal dialog and closes it on backdrop click", () => {
    installMatchMedia("mobile");
    renderMobileShell();

    fireEvent.click(topBarToggle());

    const drawer = screen.getByRole("dialog", { name: "Application sidebar" });
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(drawer).toHaveAttribute("data-overlay", "true");
    expect(drawer).toHaveAttribute("data-state", "expanded");

    fireEvent.click(screen.getByRole("button", { name: "Close Application sidebar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(topBarToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("moves focus into the drawer, traps Tab, and returns focus to the toggle on Escape", () => {
    installMatchMedia("mobile");
    renderMobileShell();

    topBarToggle().focus();
    fireEvent.click(topBarToggle());

    const drawer = screen.getByRole("dialog", { name: "Application sidebar" });
    const first = within(drawer).getByRole("button", { name: "Collapse application sidebar" });
    const last = within(drawer).getByRole("link", { name: "Inside link" });
    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(topBarToggle()).toHaveFocus();
  });

  it("locks body scroll while a drawer is open", () => {
    installMatchMedia("mobile");
    renderMobileShell();

    fireEvent.click(topBarToggle());
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the mobile drawer when the route changes", () => {
    installMatchMedia("mobile");
    const view = renderMobileShell();

    fireEvent.click(topBarToggle());
    expect(screen.getByRole("dialog", { name: "Application sidebar" })).toBeInTheDocument();

    pathname = "/notes/n2";
    view.rerender(mobileShell());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves the desktop sidebar alone on route changes", () => {
    installMatchMedia("desktop");
    const view = renderMobileShell();

    pathname = "/notes/n2";
    view.rerender(mobileShell());

    expect(screen.getByRole("complementary", { name: "Application sidebar" })).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });

  it("returns focus to the tablet's floating context toggle on Escape", () => {
    installMatchMedia("tablet");
    renderShell();

    const toggle = screen.getByRole("button", { name: "Expand context panel" });
    toggle.focus();
    fireEvent.click(toggle);
    expect(screen.getByRole("dialog", { name: "Context panel" })).toHaveAttribute(
      "aria-modal",
      "true",
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand context panel" })).toHaveFocus();
  });
});
