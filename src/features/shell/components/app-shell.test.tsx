import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders the documented three-zone layout", () => {
    render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );

    const sidebar = screen.getByRole("complementary", { name: "Application sidebar" });
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(sidebar).toHaveClass("duration-structural", "transition-width", "ease-out");
    expect(
      within(sidebar).getByRole("button", { name: "Collapse application sidebar" }),
    ).toHaveClass("duration-micro");
    expect(screen.getByRole("main")).toHaveTextContent("Workspace content");
    expect(screen.getByRole("complementary", { name: "Context panel" })).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });

  it("collapses and expands the application sidebar independently", () => {
    render(<AppShell>Workspace content</AppShell>);

    const sidebar = screen.getByRole("complementary", { name: "Application sidebar" });
    const contextPanel = screen.getByRole("complementary", { name: "Context panel" });

    fireEvent.click(within(sidebar).getByRole("button", { name: "Collapse application sidebar" }));

    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    expect(sidebar).toHaveClass("ease-in");
    expect(
      within(sidebar).getByRole("button", { name: "Expand application sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(contextPanel).toHaveAttribute("data-state", "expanded");

    fireEvent.click(within(sidebar).getByRole("button", { name: "Expand application sidebar" }));

    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(sidebar).toHaveClass("ease-out");
  });

  it("toggles the sidebar with ⌘\\ and the context panel with ⌘E (SHELL-05)", () => {
    render(<AppShell>Workspace content</AppShell>);

    const sidebar = screen.getByRole("complementary", { name: "Application sidebar" });
    const contextPanel = screen.getByRole("complementary", { name: "Context panel" });

    fireEvent.keyDown(document, { key: "\\", metaKey: true });
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    expect(contextPanel).toHaveAttribute("data-state", "expanded");

    fireEvent.keyDown(document, { ctrlKey: true, key: "e" });
    expect(contextPanel).toHaveAttribute("data-state", "collapsed");

    fireEvent.keyDown(document, { key: "\\", metaKey: true });
    expect(sidebar).toHaveAttribute("data-state", "expanded");
  });

  it("collapses and expands the context panel independently", () => {
    render(<AppShell>Workspace content</AppShell>);

    const sidebar = screen.getByRole("complementary", { name: "Application sidebar" });
    const contextPanel = screen.getByRole("complementary", { name: "Context panel" });

    fireEvent.click(within(contextPanel).getByRole("button", { name: "Collapse context panel" }));

    expect(contextPanel).toHaveAttribute("data-state", "collapsed");
    expect(
      within(contextPanel).getByRole("button", { name: "Expand context panel" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(sidebar).toHaveAttribute("data-state", "expanded");

    fireEvent.click(within(contextPanel).getByRole("button", { name: "Expand context panel" }));

    expect(contextPanel).toHaveAttribute("data-state", "expanded");
  });
});
