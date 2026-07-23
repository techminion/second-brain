import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandPalette } from "./command-palette";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function openPalette() {
  fireEvent.keyDown(document, { key: "k", metaKey: true });
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is hidden on initial render", () => {
    render(<CommandPalette />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens when ⌘K is pressed", () => {
    render(<CommandPalette />);

    openPalette();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("also opens with Ctrl+K (Windows/Linux)", () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("toggles closed when ⌘K is pressed while open", () => {
    render(<CommandPalette />);

    openPalette();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    openPalette();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists all registered commands", () => {
    render(<CommandPalette />);
    openPalette();

    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option").length).toBeGreaterThanOrEqual(1);
  });

  it("shows shortcuts inline next to commands that have one", () => {
    render(<CommandPalette />);
    openPalette();

    expect(screen.getByRole("dialog")).toHaveTextContent("⌘N");
    expect(screen.getByRole("dialog")).toHaveTextContent("⇧⌘F");
  });

  it("filters commands as the user types", () => {
    render(<CommandPalette />);
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "settings" } });

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Open settings");
  });

  it("shows 'No commands found' when the query matches nothing", () => {
    render(<CommandPalette />);
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz-no-match" } });

    expect(screen.getByText("No commands found.")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("navigates to the href of an enabled command when clicked", () => {
    render(<CommandPalette />);
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "settings" } });
    fireEvent.click(screen.getByRole("option", { name: /open settings/i }));

    expect(pushMock).toHaveBeenCalledWith("/settings");
  });

  it("does not navigate when a disabled command is clicked", () => {
    render(<CommandPalette />);
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new note" } });
    fireEvent.click(screen.getByRole("option", { name: /new note/i }));

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("moves the active item down with ArrowDown", () => {
    render(<CommandPalette />);
    openPalette();

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });

    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("moves the active item up with ArrowUp", () => {
    render(<CommandPalette />);
    openPalette();

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });

    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("executes the active enabled command on Enter", () => {
    render(<CommandPalette />);
    openPalette();

    // Navigate to "Open settings" (the last command, and the only enabled one)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "settings" } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });

    expect(pushMock).toHaveBeenCalledWith("/settings");
  });

  it("does not trigger on ⌘K inside a contenteditable element", () => {
    render(
      <div>
        <div contentEditable id="editor" />
        <CommandPalette />
      </div>,
    );

    const editor = document.getElementById("editor")!;
    editor.focus();
    fireEvent.keyDown(editor, { key: "k", metaKey: true });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("resets the query when reopened", () => {
    render(<CommandPalette />);
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "settings" } });
    expect(screen.getByRole("combobox")).toHaveValue("settings");

    // Close via ⌘K toggle then reopen
    openPalette();
    openPalette();

    expect(screen.getByRole("combobox")).toHaveValue("");
  });
});
