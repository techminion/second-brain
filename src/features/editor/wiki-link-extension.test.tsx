import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownEditor, type WikiLinkController } from "./components/markdown-editor";

function controller(overrides: Partial<WikiLinkController> = {}): WikiLinkController {
  return {
    isResolved: (title) => title === "Known",
    open: vi.fn(),
    resolutionKey: "k1",
    suggest: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

async function editorElement() {
  return screen.findByRole("textbox", { name: "Note body" });
}

describe("wiki links in the editor (LINK-05/07/09)", () => {
  it("renders resolved and unresolved links distinctly, never inside code", async () => {
    render(
      <MarkdownEditor
        onChange={vi.fn()}
        value={"See [[Known]] and [[Missing]] and `[[Code]]`\n\n```\n[[Fenced]]\n```"}
        wikiLinks={controller()}
      />,
    );
    const editor = await editorElement();

    await waitFor(() => {
      expect(editor.querySelector('[data-wiki-title="Known"]')).toHaveAttribute(
        "data-wiki-link",
        "resolved",
      );
    });
    expect(editor.querySelector('[data-wiki-title="Missing"]')).toHaveAttribute(
      "data-wiki-link",
      "unresolved",
    );
    expect(editor.querySelector('[data-wiki-title="Code"]')).toBeNull();
    expect(editor.querySelector('[data-wiki-title="Fenced"]')).toBeNull();
  });

  it("opens a link on click", async () => {
    const links = controller();
    render(<MarkdownEditor onChange={vi.fn()} value="Go to [[Known]]" wikiLinks={links} />);
    const editor = await editorElement();

    const link = await waitFor(() => {
      const element = editor.querySelector('[data-wiki-title="Known"]');
      expect(element).not.toBeNull();
      return element as Element;
    });
    fireEvent.click(link, { button: 0 });

    expect(links.open).toHaveBeenCalledWith("Known");
  });

  it("re-renders resolution when the controller's resolution key changes", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownEditor onChange={onChange} value="[[Later]]" wikiLinks={controller()} />,
    );
    const editor = await editorElement();
    await waitFor(() =>
      expect(editor.querySelector('[data-wiki-link="unresolved"]')).not.toBeNull(),
    );

    rerender(
      <MarkdownEditor
        onChange={onChange}
        value="[[Later]]"
        wikiLinks={controller({ isResolved: () => true, resolutionKey: "k2" })}
      />,
    );

    await waitFor(() =>
      expect(editor.querySelector('[data-wiki-title="Later"]')).toHaveAttribute(
        "data-wiki-link",
        "resolved",
      ),
    );
  });

  it("does not decorate or change serialization without a controller", async () => {
    const onChange = vi.fn();
    render(<MarkdownEditor onChange={onChange} value="[[Plain]]" />);
    const editor = await editorElement();

    await waitFor(() => expect(editor).toHaveTextContent("[[Plain]]"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("[[ autocomplete (LINK-06)", () => {
  it("suggests titles for the typed query and inserts the chosen one", async () => {
    const suggest = vi.fn().mockResolvedValue(["Project Plan", "Planning"]);
    const onChange = vi.fn();
    const { container } = render(
      <MarkdownEditor onChange={onChange} value="" wikiLinks={controller({ suggest })} />,
    );
    const editor = await editorElement();

    // Drive the real editor: focus, then type through the Tiptap command API.
    const tiptap = await waitFor(() => {
      const instance = (
        container.querySelector(".ProseMirror") as HTMLElement & {
          editor?: { commands: { focus: () => void; insertContent: (text: string) => void } };
        }
      ).editor;
      expect(instance).toBeDefined();
      return instance!;
    });
    act(() => {
      editor.focus();
      tiptap.commands.focus();
      tiptap.commands.insertContent("see [[pla");
    });

    const listbox = await screen.findByRole("listbox", { name: "Link suggestions" });
    expect(suggest).toHaveBeenLastCalledWith("pla");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Project Plan",
      "Planning",
    ]);
    expect(editor).toHaveAttribute("aria-controls", listbox.id);

    fireEvent.keyDown(editor, { key: "ArrowDown" });
    fireEvent.keyDown(editor, { key: "Enter" });

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("see [[Planning]]"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
