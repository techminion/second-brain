import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShortcutProvider } from "../shortcuts/shortcut-manager";
import { CommandPalette } from "./command-palette";
import { ShellPanelsProvider, useShellPanels } from "./shell-panels-context";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// jsdom does not implement scrollIntoView; the palette calls it on the
// active option.
Element.prototype.scrollIntoView = vi.fn();

function PanelStateProbe() {
  const { isLeftExpanded, isRightExpanded } = useShellPanels();
  return (
    <output aria-label="panel state">{`left:${isLeftExpanded} right:${isRightExpanded}`}</output>
  );
}

function renderPalette() {
  return render(
    <ShortcutProvider>
      <ShellPanelsProvider>
        <PanelStateProbe />
        <CommandPalette />
      </ShellPanelsProvider>
    </ShortcutProvider>,
  );
}

function openPalette() {
  fireEvent.keyDown(document, { key: "k", metaKey: true });
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is hidden on initial render", () => {
    renderPalette();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens when ⌘K is pressed", () => {
    renderPalette();

    openPalette();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("also opens with Ctrl+K (Windows/Linux)", () => {
    renderPalette();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("toggles closed when ⌘K is pressed while open", () => {
    renderPalette();

    openPalette();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    openPalette();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists all registered commands", () => {
    renderPalette();
    openPalette();

    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option").length).toBeGreaterThanOrEqual(1);
  });

  it("shows shortcuts inline next to commands that have one", () => {
    renderPalette();
    openPalette();

    expect(screen.getByRole("dialog")).toHaveTextContent("⌘N");
    expect(screen.getByRole("dialog")).toHaveTextContent("⇧⌘F");
  });

  it("filters commands as the user types", () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "settings" } });

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Open settings");
  });

  it("shows 'No commands found' when the query matches nothing", () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz-no-match" } });

    expect(screen.getByText("No commands found.")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("navigates to the href of an enabled command when clicked", () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "settings" } });
    fireEvent.click(screen.getByRole("option", { name: /open settings/i }));

    expect(pushMock).toHaveBeenCalledWith("/settings");
  });

  it("does not navigate when a disabled command is clicked", () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new note" } });
    fireEvent.click(screen.getByRole("option", { name: /new note/i }));

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("moves the active item down with ArrowDown", () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });

    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("moves the active item up with ArrowUp", () => {
    renderPalette();
    openPalette();

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });

    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("executes the active enabled command on Enter", () => {
    renderPalette();
    openPalette();

    // Navigate to "Open settings" (the last command, and the only enabled one)
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "settings" } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });

    expect(pushMock).toHaveBeenCalledWith("/settings");
  });

  it("does not trigger on ⌘K inside a contenteditable element", () => {
    render(
      <ShortcutProvider>
        <ShellPanelsProvider>
          <div contentEditable id="editor" />
          <CommandPalette />
        </ShellPanelsProvider>
      </ShortcutProvider>,
    );

    const editor = document.getElementById("editor")!;
    editor.focus();
    fireEvent.keyDown(editor, { key: "k", metaKey: true });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on ⌘K from an ordinary text input (block-editable policy)", () => {
    render(
      <ShortcutProvider>
        <ShellPanelsProvider>
          <input aria-label="search field" />
          <CommandPalette />
        </ShellPanelsProvider>
      </ShortcutProvider>,
    );

    fireEvent.keyDown(screen.getByLabelText("search field"), { key: "k", metaKey: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens on ⌘K with Caps Lock producing an uppercase key", () => {
    renderPalette();

    fireEvent.keyDown(document, { key: "K", metaKey: true });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("toggles the sidebar through the enabled Toggle sidebar command", () => {
    renderPalette();
    openPalette();

    expect(screen.getByLabelText("panel state")).toHaveTextContent("left:true right:true");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "toggle sidebar" } });
    fireEvent.click(screen.getByRole("option", { name: /toggle sidebar/i }));

    expect(screen.getByLabelText("panel state")).toHaveTextContent("left:false right:true");
  });

  it("toggles the right panel through the enabled Toggle right panel command", () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "right panel" } });
    fireEvent.click(screen.getByRole("option", { name: /toggle right panel/i }));

    expect(screen.getByLabelText("panel state")).toHaveTextContent("left:true right:false");
  });

  it("keeps the active option in view while arrowing", () => {
    renderPalette();
    openPalette();

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("resets the query when reopened", () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "settings" } });
    expect(screen.getByRole("combobox")).toHaveValue("settings");

    // Close via ⌘K toggle then reopen
    openPalette();
    openPalette();

    expect(screen.getByRole("combobox")).toHaveValue("");
  });
});
