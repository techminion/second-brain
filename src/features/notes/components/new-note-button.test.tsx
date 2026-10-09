import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetCreateAndOpenNoteForTests } from "../hooks/use-create-and-open-note";
import { NewNoteButton } from "./new-note-button";

const mutateAsync = vi.fn();
const push = vi.fn();

vi.mock("../hooks/use-note-mutations", () => ({
  useCreateNote: () => ({ isPending: false, mutateAsync }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// This test uses the real shared hook: flush its promise chain and reset the
// module-level in-flight guard so no test leaks into the next.
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  resetCreateAndOpenNoteForTests();
  mutateAsync.mockReset();
  push.mockReset();
});

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
