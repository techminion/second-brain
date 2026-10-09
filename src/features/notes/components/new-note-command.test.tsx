import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CommandHandlersProvider,
  useCommandHandler,
} from "@/features/shell/commands/command-handlers";
import { ShortcutProvider } from "@/features/shell/shortcuts/shortcut-manager";

import { NewNoteCommand } from "./new-note-command";

const createAndOpen = vi.fn();

vi.mock("../hooks/use-create-and-open-note", () => ({
  useCreateAndOpenNote: () => ({ createAndOpen, isPending: false }),
}));

function PaletteProbe() {
  const handler = useCommandHandler("new-note");
  return (
    <button onClick={() => handler?.()} type="button">
      palette new note
    </button>
  );
}

function renderCommand() {
  return render(
    <ShortcutProvider>
      <CommandHandlersProvider>
        <div aria-label="editor" contentEditable role="textbox" tabIndex={0} />
        <input aria-label="title" />
        <PaletteProbe />
        <NewNoteCommand />
      </CommandHandlersProvider>
    </ShortcutProvider>,
  );
}

const ctrlAltN = { altKey: true, code: "KeyN", ctrlKey: true, key: "n" };

afterEach(() => createAndOpen.mockReset());

describe("NewNoteCommand", () => {
  it("creates and opens a note on Ctrl+Alt+N", () => {
    renderCommand();

    fireEvent.keyDown(document, ctrlAltN);

    expect(createAndOpen).toHaveBeenCalledTimes(1);
  });

  it("creates on ⌥⌘N, where macOS turns event.key into a dead-key character", () => {
    renderCommand();

    fireEvent.keyDown(document, { altKey: true, code: "KeyN", key: "˜", metaKey: true });

    expect(createAndOpen).toHaveBeenCalledTimes(1);
  });

  it("ignores auto-repeat from a held key", () => {
    renderCommand();

    fireEvent.keyDown(document, ctrlAltN);
    fireEvent.keyDown(document, { ...ctrlAltN, repeat: true });
    fireEvent.keyDown(document, { ...ctrlAltN, repeat: true });

    expect(createAndOpen).toHaveBeenCalledTimes(1);
  });

  it("fires from inside the editor and from plain inputs", () => {
    renderCommand();

    fireEvent.keyDown(screen.getByLabelText("editor"), ctrlAltN);
    fireEvent.keyDown(screen.getByLabelText("title"), ctrlAltN);

    expect(createAndOpen).toHaveBeenCalledTimes(2);
  });

  it("does not intercept Ctrl+N or ⌘N", () => {
    renderCommand();

    fireEvent.keyDown(document, { code: "KeyN", ctrlKey: true, key: "n" });
    fireEvent.keyDown(document, { code: "KeyN", key: "n", metaKey: true });

    expect(createAndOpen).not.toHaveBeenCalled();
  });

  it("registers the palette's New note handler with the same create", () => {
    renderCommand();

    fireEvent.click(screen.getByRole("button", { name: "palette new note" }));

    expect(createAndOpen).toHaveBeenCalledTimes(1);
  });
});
