import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountMenu } from "./account-menu";
import { NoteContextPanel } from "./note-context-panel";
import { SidebarNavigation } from "./sidebar-navigation";

let pathname = "/";

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("./shell-panels-context", () => ({
  useShellPanels: () => ({
    collapseRight: vi.fn(),
    isRightExpanded: true,
    tier: "desktop",
    toggleRight: vi.fn(),
  }),
}));

describe("SidebarNavigation", () => {
  it("lists the primary destinations before the knowledge sections", () => {
    render(
      <SidebarNavigation
        dailySlot={<a href="/daily">Today</a>}
        newNoteSlot={<button type="button">New note</button>}
        notesSlot={<div>note slot content</div>}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Knowledge navigation" });
    expect(nav).toHaveTextContent(/New note.*Search.*Today.*Graph.*Trash/);
    expect(screen.getByRole("link", { name: /Search/ })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: /Graph/ })).toHaveAttribute("href", "/graph");
    expect(screen.getByRole("link", { name: /Trash/ })).toHaveAttribute("href", "/trash");
    expect(screen.getByText("note slot content")).toBeInTheDocument();
  });

  it("marks the current destination", () => {
    pathname = "/graph";
    render(<SidebarNavigation />);

    expect(screen.getByRole("link", { name: /Graph/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Trash/ })).not.toHaveAttribute("aria-current");
    pathname = "/";
  });
});

describe("AccountMenu", () => {
  it("names the signed-in user and logs out through the server-action form", () => {
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => undefined);
    const { container } = render(
      <AccountMenu displayName="Ada" email="ada@example.com" signOutAction={vi.fn()} />,
    );

    const trigger = screen.getByRole("button", { name: "Account: Ada" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings");
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

    expect(container.querySelector("form")).toBeInTheDocument();
    expect(requestSubmit).toHaveBeenCalledTimes(1);
    requestSubmit.mockRestore();
  });

  it("falls back to the email when there is no display name", () => {
    render(<AccountMenu displayName={null} email="ada@example.com" signOutAction={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Account: ada@example.com" })).toBeInTheDocument();
  });
});

describe("NoteContextPanel", () => {
  it.each([
    ["/notes/n1", true],
    ["/daily", true],
    ["/daily/2026-10-01", true],
    ["/", false],
    ["/search", false],
    ["/settings", false],
  ])("on %s shows the panel: %s", (route, shown) => {
    pathname = route;
    render(<NoteContextPanel>backlinks</NoteContextPanel>);

    expect(screen.queryByRole("complementary", { name: "Context panel" }) !== null).toBe(shown);
    pathname = "/";
  });
});
