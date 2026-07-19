import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders the documented three-zone layout", () => {
    render(
      <AppShell>
        <p>Workspace content</p>
      </AppShell>,
    );

    expect(screen.getByRole("complementary", { name: "Application sidebar" })).toHaveAttribute(
      "data-state",
      "expanded",
    );
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
    expect(
      within(sidebar).getByRole("button", { name: "Expand application sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(contextPanel).toHaveAttribute("data-state", "expanded");

    fireEvent.click(within(sidebar).getByRole("button", { name: "Expand application sidebar" }));

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
