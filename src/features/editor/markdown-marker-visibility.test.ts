import { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import { markdownEditorExtensions } from "./markdown-editor-extensions";
import { serializeEditorMarkdown } from "./markdown-round-trip";

function createEditor(content: string) {
  const element = document.createElement("div");
  document.body.append(element);

  const editor = new Editor({
    content,
    contentType: "markdown",
    element,
    extensions: markdownEditorExtensions,
  });

  return {
    editor,
    destroy: () => {
      editor.destroy();
      element.remove();
    },
  };
}

function positionOf(editor: Editor, text: string): number {
  let position: number | null = null;

  editor.state.doc.descendants((node, nodePosition) => {
    const offset = node.isText ? node.text?.indexOf(text) : undefined;
    if (offset !== undefined && offset >= 0) {
      position = nodePosition + offset;
      return false;
    }
    return position === null;
  });

  if (position === null) {
    throw new Error(`Text not found in editor document: ${text}`);
  }

  return position;
}

function markers(editor: Editor, name: string): HTMLElement[] {
  return Array.from(
    editor.view.dom.querySelectorAll<HTMLElement>(`[data-markdown-marker="${name}"]`),
  );
}

describe("MarkdownMarkerVisibility", () => {
  it.each([
    { markdown: "Plain **bold** tail", marker: "**", name: "bold", text: "bold" },
    { markdown: "Plain *italic* tail", marker: "*", name: "italic", text: "italic" },
    { markdown: "Plain `code` tail", marker: "`", name: "code", text: "code" },
  ])("reveals $name markers only while its span contains the focused cursor", (sample) => {
    const { destroy, editor } = createEditor(sample.markdown);

    try {
      editor.commands.setTextSelection(positionOf(editor, sample.text) + 1);
      expect(markers(editor, sample.name)).toHaveLength(0);

      editor.view.focus();

      const visibleMarkers = markers(editor, sample.name);
      expect(visibleMarkers).toHaveLength(2);
      expect(visibleMarkers.map((marker) => marker.textContent)).toEqual([
        sample.marker,
        sample.marker,
      ]);
      expect(visibleMarkers.map((marker) => marker.dataset.markdownMarkerEdge)).toEqual([
        "open",
        "close",
      ]);
      expect(visibleMarkers.every((marker) => marker.getAttribute("aria-hidden") === "true")).toBe(
        true,
      );

      editor.commands.setTextSelection(positionOf(editor, "Plain") + 1);
      expect(markers(editor, sample.name)).toHaveLength(0);
      expect(serializeEditorMarkdown(editor)).toBe(sample.markdown);
    } finally {
      destroy();
    }
  });

  it("reveals the matching heading marker without changing saved Markdown", () => {
    const markdown = "### Heading\n\nParagraph";
    const { destroy, editor } = createEditor(markdown);

    try {
      editor.commands.setTextSelection(positionOf(editor, "Heading") + 1);
      editor.view.focus();

      const visibleMarkers = markers(editor, "heading");
      expect(visibleMarkers).toHaveLength(1);
      expect(visibleMarkers[0]).toHaveTextContent("###");
      expect(serializeEditorMarkdown(editor)).toBe(markdown);

      editor.commands.setTextSelection(positionOf(editor, "Paragraph") + 1);
      expect(markers(editor, "heading")).toHaveLength(0);
    } finally {
      destroy();
    }
  });
});
