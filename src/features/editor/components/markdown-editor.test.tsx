import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownEditor } from "./markdown-editor";

describe("MarkdownEditor", () => {
  it("renders Markdown as a labelled live-formatting surface", async () => {
    const onChange = vi.fn();

    render(<MarkdownEditor value={"# Heading\n\nThis is **bold**."} onChange={onChange} />);

    const editor = await screen.findByRole("textbox", { name: "Note body" });

    expect(editor).toHaveAttribute("aria-multiline", "true");
    expect(editor).toHaveAttribute("contenteditable", "true");
    expect(editor.querySelector("h1")).toHaveTextContent("Heading");
    expect(editor.querySelector("strong")).toHaveTextContent("bold");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies externally controlled Markdown without emitting a change", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<MarkdownEditor value="First paragraph" onChange={onChange} />);

    const editor = await screen.findByRole("textbox", { name: "Note body" });

    rerender(<MarkdownEditor value="## Replacement" onChange={onChange} />);

    await waitFor(() => {
      expect(editor.querySelector("h2")).toHaveTextContent("Replacement");
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports a read-only state and a custom accessible name", async () => {
    render(
      <MarkdownEditor
        ariaLabel="Archived note body"
        editable={false}
        value="Read only"
        onChange={vi.fn()}
      />,
    );

    const editor = await screen.findByRole("textbox", {
      name: "Archived note body",
    });

    expect(editor).toHaveAttribute("aria-disabled", "true");
    expect(editor).toHaveAttribute("contenteditable", "false");
  });

  it("renders task lists as labelled checkboxes and serializes a toggle (EDIT-05)", async () => {
    const onChange = vi.fn();

    render(<MarkdownEditor value={"- [ ] Draft\n- [x] Review"} onChange={onChange} />);

    const open = await screen.findByRole("checkbox", { name: "Task: Draft" });
    const done = screen.getByRole("checkbox", { name: "Task: Review" });

    expect(open).not.toBeChecked();
    expect(done).toBeChecked();

    fireEvent.click(open);

    // StarterKit's trailing-node plugin appends an empty paragraph after a
    // final list, so compare the trimmed markdown.
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
    const lastMarkdown = String(onChange.mock.lastCall?.[0]);
    expect(lastMarkdown.trim()).toBe("- [x] Draft\n- [x] Review");
  });

  it("names each task checkbox from its own text, not its nested sub-tasks", async () => {
    render(<MarkdownEditor onChange={vi.fn()} value={"- [ ] Parent\n  - [x] Child"} />);

    expect(await screen.findByRole("checkbox", { name: "Task: Parent" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Task: Child" })).toBeChecked();
  });

  // EDIT-17: formatting through the editor's own keymap, end to end through
  // serialization (Mod = Ctrl outside macOS, as in jsdom).
  it.each([
    ["b", "**Plan**"],
    ["i", "*Plan*"],
    ["e", "`Plan`"],
  ])("formats the selection with Ctrl+%s and serializes it", async (key, markdown) => {
    const onChange = vi.fn();
    const { container } = render(<MarkdownEditor onChange={onChange} value="Plan" />);
    const editor = await screen.findByRole("textbox", { name: "Note body" });
    const tiptap = await waitFor(() => {
      const instance = (
        container.querySelector(".ProseMirror") as HTMLElement & {
          editor?: { commands: { focus: () => void; selectAll: () => void } };
        }
      ).editor;
      expect(instance).toBeDefined();
      return instance!;
    });

    act(() => {
      editor.focus();
      tiptap.commands.focus();
      tiptap.commands.selectAll();
    });
    fireEvent.keyDown(editor, { ctrlKey: true, key });

    await waitFor(() => expect(String(onChange.mock.lastCall?.[0]).trim()).toBe(markdown));
  });

  it("undoes and redoes with Ctrl+Z / Ctrl+Shift+Z", async () => {
    const onChange = vi.fn();
    const { container } = render(<MarkdownEditor onChange={onChange} value="Plan" />);
    const editor = await screen.findByRole("textbox", { name: "Note body" });
    const tiptap = await waitFor(() => {
      const instance = (
        container.querySelector(".ProseMirror") as HTMLElement & {
          editor?: { commands: { focus: () => void; selectAll: () => void } };
        }
      ).editor;
      expect(instance).toBeDefined();
      return instance!;
    });
    act(() => {
      editor.focus();
      tiptap.commands.focus();
      tiptap.commands.selectAll();
    });
    fireEvent.keyDown(editor, { ctrlKey: true, key: "b" });
    await waitFor(() => expect(String(onChange.mock.lastCall?.[0]).trim()).toBe("**Plan**"));

    fireEvent.keyDown(editor, { ctrlKey: true, key: "z" });
    await waitFor(() => expect(String(onChange.mock.lastCall?.[0]).trim()).toBe("Plan"));
    fireEvent.keyDown(editor, { ctrlKey: true, key: "z", shiftKey: true });
    await waitFor(() => expect(String(onChange.mock.lastCall?.[0]).trim()).toBe("**Plan**"));
  });

  it("leaves the editor on Escape so Tab can move on (EDIT-15)", async () => {
    render(<MarkdownEditor onChange={vi.fn()} value="Text" />);
    const editor = await screen.findByRole("textbox", { name: "Note body" });
    act(() => editor.focus());
    expect(editor).toHaveFocus();

    fireEvent.keyDown(editor, { key: "Escape" });

    expect(editor).not.toHaveFocus();
  });
});
