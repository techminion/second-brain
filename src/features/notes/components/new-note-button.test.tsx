import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NewNoteButton } from "./new-note-button";

const mutate = vi.fn();
const push = vi.fn();

vi.mock("../hooks/use-note-mutations", () => ({
  useCreateNote: () => ({ isPending: false, mutate }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("NewNoteButton", () => {
  it("creates an untitled note and opens it", () => {
    mutate.mockImplementation(
      (_input, options?: { onSettled?: () => void; onSuccess?: (n: { id: string }) => void }) => {
        options?.onSuccess?.({ id: "new-id" });
        // Settle, so the shared in-flight guard is released for later tests.
        options?.onSettled?.();
      },
    );

    render(<NewNoteButton />);
    fireEvent.click(screen.getByRole("button", { name: "New note" }));

    expect(mutate).toHaveBeenCalledWith({ title: "Untitled" }, expect.any(Object));
    expect(push).toHaveBeenCalledWith("/notes/new-id");
  });

  it("shows the ⌥⌘N hint without changing the accessible name (UX-07)", () => {
    render(<NewNoteButton />);

    const button = screen.getByRole("button", { name: "New note" });
    expect(button).toHaveAccessibleName("New note");
    expect(button).toHaveTextContent("⌥⌘N");
  });
});
