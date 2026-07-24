import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../note-api";
import { NoteView } from "./note-view";

const useNoteQuery = vi.fn();

vi.mock("../hooks/use-note-query", () => ({ useNoteQuery: (id: string) => useNoteQuery(id) }));
vi.mock("./note-editor", () => ({
  NoteEditor: ({ note }: { note: { title: string } }) => <div>editor:{note.title}</div>,
}));

afterEach(() => {
  useNoteQuery.mockReset();
});

describe("NoteView", () => {
  it("renders a skeleton while the note loads", () => {
    useNoteQuery.mockReturnValue({ isPending: true, isError: false });

    const { container } = render(<NoteView noteId="n1" />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByText(/editor:/)).not.toBeInTheDocument();
  });

  it("renders the editor once the note loads", () => {
    useNoteQuery.mockReturnValue({
      data: { title: "Loaded" },
      isError: false,
      isPending: false,
    });

    render(<NoteView noteId="n1" />);

    expect(screen.getByText("editor:Loaded")).toBeInTheDocument();
  });

  it("shows a not-found message for a 404", () => {
    useNoteQuery.mockReturnValue({
      error: new ApiError(404, "NOT_FOUND", "gone"),
      isError: true,
      isPending: false,
    });

    render(<NoteView noteId="n1" />);

    expect(screen.getByRole("status")).toHaveTextContent("doesn’t exist or has been deleted");
  });

  it("shows a generic message for a non-404 error", () => {
    useNoteQuery.mockReturnValue({
      error: new Error("network"),
      isError: true,
      isPending: false,
    });

    render(<NoteView noteId="n1" />);

    expect(screen.getByRole("status")).toHaveTextContent("Something went wrong");
  });
});
