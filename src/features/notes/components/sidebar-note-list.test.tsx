import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SidebarNoteList } from "./sidebar-note-list";

const useNotesList = vi.fn();
const createMutate = vi.fn();
const push = vi.fn();
let pathname = "/";

vi.mock("../hooks/use-notes-list", () => ({ useNotesList: () => useNotesList() }));
vi.mock("../hooks/use-note-mutations", () => ({
  useCreateNote: () => ({ isPending: false, mutate: createMutate }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

function page(items: { id: string; title: string; updatedAt: string }[]) {
  return { pages: [{ items }], pageParams: [undefined] };
}

afterEach(() => {
  useNotesList.mockReset();
  createMutate.mockReset();
  push.mockReset();
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

  it("creates a note and navigates to it", () => {
    createMutate.mockImplementation(
      (_input, options?: { onSuccess?: (n: { id: string }) => void }) =>
        options?.onSuccess?.({ id: "new-id" }),
    );
    useNotesList.mockReturnValue({ data: page([]), isPending: false });

    render(<SidebarNoteList />);
    fireEvent.click(screen.getByRole("button", { name: "New note" }));

    expect(createMutate).toHaveBeenCalledWith({ title: "Untitled" }, expect.any(Object));
    expect(push).toHaveBeenCalledWith("/notes/new-id");
  });
});
