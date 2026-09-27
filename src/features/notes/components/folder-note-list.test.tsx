import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FolderNoteList } from "./folder-note-list";

const useNotesList = vi.fn();
const createMutate = vi.fn();
const push = vi.fn();

vi.mock("../hooks/use-notes-list", () => ({
  useNotesList: (filters: unknown) => useNotesList(filters),
}));
vi.mock("../hooks/use-note-mutations", () => ({
  useCreateNote: () => ({ isPending: false, mutate: createMutate }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => vi.clearAllMocks());

describe("FolderNoteList", () => {
  it("filters the note list by folder and lists its notes", () => {
    useNotesList.mockReturnValue({
      data: {
        pages: [{ items: [{ id: "n1", title: "Plan", updatedAt: new Date().toISOString() }] }],
      },
      isPending: false,
    });

    render(<FolderNoteList folderId="f1" />);

    expect(useNotesList).toHaveBeenCalledWith({ folderId: "f1" });
    expect(screen.getByRole("link", { name: /Plan/ })).toHaveAttribute("href", "/notes/n1");
  });

  it("shows the empty-folder state and creates a note in the folder", () => {
    useNotesList.mockReturnValue({ data: { pages: [{ items: [] }] }, isPending: false });

    render(<FolderNoteList folderId="f1" />);

    expect(screen.getByText("This folder is empty.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New note in this folder" }));
    expect(createMutate).toHaveBeenCalledWith(
      { folderId: "f1", title: "Untitled" },
      expect.any(Object),
    );
  });
});
