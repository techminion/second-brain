import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { MarkdownEditor } from "./components/markdown-editor";
import { filterSlashCommands, slashCommands } from "./slash-commands";

interface TiptapHandle {
  commands: { focus: () => void; insertContent: (text: string) => void };
}

// Block commands scroll the selection into view, which asks for layout rects
// jsdom does not implement; an empty rect list is enough for these tests.
beforeAll(() => {
  const emptyRects = () => [] as unknown as DOMRectList;
  for (const proto of [Range.prototype, Element.prototype]) {
    if (!("getClientRects" in proto) || typeof proto.getClientRects !== "function") {
      Object.defineProperty(proto, "getClientRects", { configurable: true, value: emptyRects });
    }
  }
});

async function setup(value = "") {
  const onChange = vi.fn();
  const { container } = render(<MarkdownEditor onChange={onChange} value={value} />);
  const editor = await screen.findByRole("textbox", { name: "Note body" });
  const tiptap = await waitFor(() => {
    const instance = (
      container.querySelector(".ProseMirror") as HTMLElement & {
        editor?: TiptapHandle;
      }
    ).editor;
    expect(instance).toBeDefined();
    return instance!;
  });
  const type = (text: string) =>
    act(() => {
      editor.focus();
      tiptap.commands.focus();
      tiptap.commands.insertContent(text);
    });
  return { editor, onChange, type };
}

describe("filterSlashCommands (EDIT-08)", () => {
  it("lists every command for an empty query", () => {
    expect(filterSlashCommands("")).toHaveLength(slashCommands.length);
  });

  it("ranks label-word prefixes before keyword prefixes before substrings", () => {
    expect(filterSlashCommands("head").map((command) => command.id)).toEqual([
      "heading-1",
      "heading-2",
      "heading-3",
    ]);
    expect(filterSlashCommands("todo")[0].id).toBe("task-list");
    expect(filterSlashCommands("h2")[0].id).toBe("heading-2");
    expect(filterSlashCommands("LIST").map((command) => command.id)).toEqual([
      "bullet-list",
      "ordered-list",
      "task-list",
    ]);
  });

  it("returns nothing for an unmatched query", () => {
    expect(filterSlashCommands("zzz")).toEqual([]);
  });
});

describe("slash menu in the editor (EDIT-08)", () => {
  it("opens on `/` at line start, filters, and inserts the chosen block", async () => {
    const { editor, onChange, type } = await setup();

    type("/");
    const menu = await screen.findByRole("listbox", { name: "Insert block" });
    expect(editor).toHaveAttribute("aria-controls", menu.id);
    expect(screen.getAllByRole("option")).toHaveLength(slashCommands.length);

    type("quo");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    expect(screen.getByRole("option", { name: /Quote/ })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(editor, { key: "Enter" });
    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "Insert block" })).not.toBeInTheDocument(),
    );
    expect(editor.querySelector("blockquote")).not.toBeNull();
    expect(editor).not.toHaveAttribute("aria-controls");

    type("Cited");
    // StarterKit's trailing node follows the quote with an empty paragraph.
    await waitFor(() => expect(String(onChange.mock.lastCall?.[0]).trim()).toBe("> Cited"));
  });

  it("navigates with the arrow keys and inserts a table", async () => {
    const { editor, onChange, type } = await setup();

    type("/ta");
    await screen.findByRole("listbox", { name: "Insert block" });
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    const tableIndex = options.findIndex((text) => text?.startsWith("Table"));
    expect(tableIndex).toBeGreaterThanOrEqual(0);
    for (let step = 0; step < tableIndex; step += 1) {
      fireEvent.keyDown(editor, { key: "ArrowDown" });
    }
    fireEvent.keyDown(editor, { key: "Enter" });

    await waitFor(() => expect(editor.querySelectorAll("table th")).toHaveLength(3));
    expect(editor.querySelectorAll("table tr")).toHaveLength(3);
    await waitFor(() => expect(String(onChange.mock.lastCall?.[0])).toMatch(/^\| +\| +\| +\|/));
  });

  it("stays closed mid-sentence and dismisses on Escape", async () => {
    const { editor, type } = await setup();

    type("and/or");
    expect(screen.queryByRole("listbox", { name: "Insert block" })).not.toBeInTheDocument();

    type(" ");
    await act(async () => {
      await Promise.resolve();
    });
    // A fresh paragraph: `/` at its start opens the menu; Escape closes it and
    // leaves the typed text alone.
    fireEvent.keyDown(editor, { key: "Enter" });
    type("/");
    await screen.findByRole("listbox", { name: "Insert block" });
    fireEvent.keyDown(editor, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "Insert block" })).not.toBeInTheDocument(),
    );
    expect(editor.textContent).toContain("/");
  });
});
