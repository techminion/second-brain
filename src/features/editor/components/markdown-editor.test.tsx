import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
