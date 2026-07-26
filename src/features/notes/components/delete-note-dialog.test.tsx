import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DeleteNoteDialog } from "./delete-note-dialog";

const replace = vi.fn();
const mutate = vi.fn();
const mutation = { isPending: false, mutate };

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("../hooks/use-note-mutations", () => ({ useDeleteNote: () => mutation }));

function renderDialog(overrides: Partial<React.ComponentProps<typeof DeleteNoteDialog>> = {}) {
  render(
    <DeleteNoteDialog isSaving={false} noteId="note-1" noteTitle="Q3 Planning" {...overrides} />,
  );
}

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
}

describe("DeleteNoteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutation.isPending = false;
  });

  it("names the note in the confirmation", () => {
    renderDialog();

    openDialog();

    expect(screen.getByRole("heading", { name: "Delete “Q3 Planning”?" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("restored for 30 days");
  });

  it("closes without deleting when cancelled", async () => {
    renderDialog();

    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mutate).not.toHaveBeenCalled();
  });

  it("deletes the selected note and returns home", () => {
    mutate.mockImplementation((_id, options?: { onSuccess?: () => void }) =>
      options?.onSuccess?.(),
    );
    renderDialog();

    openDialog();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete note" }),
    );

    expect(mutate).toHaveBeenCalledWith("note-1", expect.any(Object));
    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open and announces a deletion error", () => {
    mutate.mockImplementation((_id, options?: { onError?: () => void }) => options?.onError?.());
    renderDialog();

    openDialog();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete note" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not delete this note");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("waits for an in-flight save before allowing deletion", () => {
    renderDialog({ isSaving: true });

    openDialog();

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("locks the dialog while deletion is pending", () => {
    mutation.isPending = true;
    renderDialog();

    openDialog();

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
