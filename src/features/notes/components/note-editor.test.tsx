import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Note } from "@/features/notes/types";

import { NoteEditor } from "./note-editor";

const mutate = vi.fn();
const mutation = {
  isError: false,
  isPending: false,
  isSuccess: false,
  mutate,
  submittedAt: 0,
};
const deleteMutation = { isPending: false, mutate: vi.fn() };
const toastError = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../hooks/use-note-mutations", () => ({
  useDeleteNote: () => deleteMutation,
  useUpdateNote: () => mutation,
}));
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));
vi.mock("@/features/editor", () => ({
  MarkdownEditor: ({
    ariaLabel,
    onChange,
    value,
  }: ComponentProps<"textarea"> & { ariaLabel: string; onChange: (v: string) => void }) => (
    <textarea
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      value={value as string}
    />
  ),
}));

vi.mock("@/features/folders", () => ({
  FolderPicker: ({
    onChange,
    value,
  }: {
    onChange: (folderId: string | null) => void;
    value: string | null;
  }) => (
    <select
      aria-label="Folder"
      onChange={(event) => onChange(event.target.value || null)}
      value={value ?? ""}
    >
      <option value="">No folder</option>
      <option value="f1">Projects</option>
    </select>
  ),
}));

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    body: "Body",
    createdAt: "2026-07-24T00:00:00Z",
    dailyNoteDate: null,
    folderId: null,
    id: "n1",
    tags: [],
    title: "Title",
    type: "note",
    updatedAt: "2026-07-24T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  mutate.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("NoteEditor", () => {
  it("seeds the title and body from the note", () => {
    render(<NoteEditor note={makeNote()} />);

    expect(screen.getByLabelText("Note title")).toHaveValue("Title");
    expect(screen.getByLabelText("Note body")).toHaveValue("Body");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("autosaves the edited body after the debounce window", () => {
    render(<NoteEditor note={makeNote({ id: "n1", title: "T" })} />);

    fireEvent.change(screen.getByLabelText("Note body"), { target: { value: "Body 2" } });
    expect(screen.getByRole("status")).toHaveTextContent("Saving…");

    act(() => vi.advanceTimersByTime(800));

    expect(mutate).toHaveBeenCalledWith(
      { id: "n1", input: { body: "Body 2", title: "T" } },
      expect.any(Object),
    );
  });

  it("omits the title from the save when it is empty", () => {
    render(<NoteEditor note={makeNote({ id: "n1" })} />);

    fireEvent.change(screen.getByLabelText("Note title"), { target: { value: "  " } });
    fireEvent.change(screen.getByLabelText("Note body"), { target: { value: "Body 2" } });
    act(() => vi.advanceTimersByTime(800));

    expect(mutate).toHaveBeenCalledWith(
      { id: "n1", input: { body: "Body 2" } },
      expect.any(Object),
    );
    expect(screen.getByText("Add a title to save this note’s name.")).toBeInTheDocument();
  });

  it("flushes the save immediately on blur", () => {
    render(<NoteEditor note={makeNote({ id: "n1", title: "T" })} />);

    fireEvent.change(screen.getByLabelText("Note body"), { target: { value: "Body 2" } });
    fireEvent.blur(screen.getByLabelText("Note body"));

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("shows a toast when the save fails", () => {
    mutate.mockImplementation((_vars, options?: { onError?: () => void }) => options?.onError?.());
    render(<NoteEditor note={makeNote({ id: "n1", title: "T" })} />);

    fireEvent.change(screen.getByLabelText("Note body"), { target: { value: "Body 2" } });
    act(() => vi.advanceTimersByTime(800));

    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it("moves the note to the folder chosen in the picker (FR-FOLDER-2)", () => {
    render(<NoteEditor note={makeNote()} />);

    fireEvent.change(screen.getByLabelText("Folder"), { target: { value: "f1" } });

    expect(mutate).toHaveBeenCalledWith(
      { id: "n1", input: { folderId: "f1" } },
      expect.any(Object),
    );
  });
});
