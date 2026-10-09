import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NewNoteButton } from "./new-note-button";

const mutateAsync = vi.fn();
const push = vi.fn();

vi.mock("../hooks/use-note-mutations", () => ({
  useCreateNote: () => ({ isPending: false, mutateAsync }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("NewNoteButton", () => {
  it("creates an untitled note and opens it", async () => {
    mutateAsync.mockResolvedValue({ id: "new-id" });

    render(<NewNoteButton />);
    fireEvent.click(screen.getByRole("button", { name: "New note" }));

    expect(mutateAsync).toHaveBeenCalledWith({ title: "Untitled" });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/notes/new-id"));
  });

  it("shows the ⌥⌘N hint without changing the accessible name (UX-07)", () => {
    render(<NewNoteButton />);

    const button = screen.getByRole("button", { name: "New note" });
    expect(button).toHaveAccessibleName("New note");
    expect(button).toHaveTextContent("⌥⌘N");
  });
});
