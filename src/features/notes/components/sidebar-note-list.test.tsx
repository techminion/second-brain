import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidebarNoteList } from "./sidebar-note-list";

const useNotesList = vi.fn();
let pathname = "/";

vi.mock("../hooks/use-notes-list", () => ({ useNotesList: () => useNotesList() }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

function page(items: { id: string; title: string; updatedAt: string; body?: string }[]) {
  return {
    pages: [{ items: items.map((item) => ({ body: "", ...item })) }],
    pageParams: [undefined],
  };
}

afterEach(() => {
  useNotesList.mockReset();
  pathname = "/";
});

describe("SidebarNoteList", () => {
  it("renders a skeleton while loading", () => {
    useNotesList.mockReturnValue({ data: undefined, isPending: true });

    const { container } = render(<SidebarNoteList />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders an empty state when there are no notes", () => {
    useNotesList.mockReturnValue({ data: page([]), isPending: false });

    render(<SidebarNoteList />);

    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });

  it("lists notes as links to their editor pages with a last-edited time", () => {
    useNotesList.mockReturnValue({
      data: page([
        { id: "n1", title: "First", updatedAt: "2026-07-24T00:00:00Z" },
        { id: "n2", title: "", updatedAt: "2026-07-24T00:00:00Z" },
      ]),
      isPending: false,
    });

    render(<SidebarNoteList />);

    expect(screen.getByRole("link", { name: /First/ })).toHaveAttribute("href", "/notes/n1");
    // An untitled note still gets a usable label.
    expect(screen.getByRole("link", { name: /Untitled/ })).toHaveAttribute("href", "/notes/n2");
    expect(screen.getAllByRole("time")).toHaveLength(2);
  });

  it("marks the active note with aria-current", () => {
    pathname = "/notes/n1";
    useNotesList.mockReturnValue({
      data: page([{ id: "n1", title: "First", updatedAt: "2026-07-24T00:00:00Z" }]),
      isPending: false,
    });

    render(<SidebarNoteList />);

    expect(screen.getByRole("link", { name: /First/ })).toHaveAttribute("aria-current", "page");
  });

  it("groups notes by recency and shows a plain-text preview", () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
    useNotesList.mockReturnValue({
      data: page([
        {
          body: "# Goals\n\nShip **search**",
          id: "n1",
          title: "Roadmap",
          updatedAt: now.toISOString(),
        },
        { id: "n2", title: "Ideas", updatedAt: yesterday.toISOString() },
      ]),
      isPending: false,
    });

    render(<SidebarNoteList />);

    expect(screen.getByRole("list", { name: "Today" })).toHaveTextContent("Roadmap");
    expect(screen.getByRole("list", { name: "Yesterday" })).toHaveTextContent("Ideas");
    expect(screen.getByRole("link", { name: /Roadmap/ })).toHaveTextContent("Goals Ship search");
  });

  it("collapses and expands from its heading", () => {
    useNotesList.mockReturnValue({ data: page([]), isPending: false });

    render(<SidebarNoteList />);
    const toggle = screen.getByRole("button", { name: "Notes" });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("No notes yet.")).not.toBeVisible();
  });
});
