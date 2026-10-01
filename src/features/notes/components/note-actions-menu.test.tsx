import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NoteActionsMenu } from "./note-actions-menu";

const toastSuccess = vi.fn();
const writeText = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: (m: string) => toastSuccess(m) } }));
vi.mock("../hooks/use-note-mutations", () => ({
  useDeleteNote: () => ({ isPending: false, mutate: vi.fn() }),
}));

function openMenu() {
  render(<NoteActionsMenu isSaving={false} noteId="n1" noteTitle="Q3 Planning" />);
  fireEvent.keyDown(screen.getByRole("button", { name: "Note actions" }), { key: "Enter" });
}

describe("NoteActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it("links to the note's local graph", () => {
    openMenu();

    expect(screen.getByRole("menuitem", { name: "Open in graph" })).toHaveAttribute(
      "href",
      "/graph?note=n1",
    );
  });

  it("copies the note's link", async () => {
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/notes/n1`);
    await vi.waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Link copied"));
  });

  it("asks before deleting, naming the note", () => {
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Delete…" }));

    expect(screen.getByRole("heading", { name: "Delete “Q3 Planning”?" })).toBeInTheDocument();
  });
});
