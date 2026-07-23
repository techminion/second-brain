import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SidebarNavigation } from "./sidebar-navigation";

const signOutAction = vi.fn(async () => undefined);

describe("SidebarNavigation", () => {
  it("renders the three documented navigation sections", () => {
    render(<SidebarNavigation signOutAction={signOutAction} />);

    const navigation = screen.getByRole("navigation", { name: "Knowledge navigation" });
    expect(navigation).toHaveTextContent("Daily note");
    expect(navigation).toHaveTextContent("Folders");
    expect(navigation).toHaveTextContent("Tags");
    expect(screen.getByRole("heading", { name: "Daily note" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Folders" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tags" })).toBeInTheDocument();
  });

  it("nav sections have no invented links (only the settings route is wired)", () => {
    render(<SidebarNavigation signOutAction={signOutAction} />);

    const nav = screen.getByRole("navigation", { name: "Knowledge navigation" });
    expect(nav.querySelectorAll("a")).toHaveLength(0);
  });

  it("renders a settings link pointing to /settings", () => {
    render(<SidebarNavigation signOutAction={signOutAction} />);

    const link = screen.getByRole("link", { name: /settings/i });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("renders a visible logout submit control", () => {
    const { container } = render(<SidebarNavigation signOutAction={signOutAction} />);

    expect(screen.getByRole("button", { name: "Log out" })).toHaveAttribute("type", "submit");
    expect(container.querySelector("form")).toBeInTheDocument();
  });
});
