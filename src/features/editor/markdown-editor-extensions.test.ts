import { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import { markdownEditorExtensions } from "./markdown-editor-extensions";

describe("markdownEditorExtensions", () => {
  it("parses Markdown into the live document model", () => {
    const editor = new Editor({
      extensions: markdownEditorExtensions,
      content: "# Heading\n\nThis is **bold** and *italic*.",
      contentType: "markdown",
    });

    expect(editor.getJSON()).toMatchObject({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Heading" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This is " },
            { type: "text", marks: [{ type: "bold" }], text: "bold" },
            { type: "text", text: " and " },
            { type: "text", marks: [{ type: "italic" }], text: "italic" },
            { type: "text", text: "." },
          ],
        },
      ],
    });

    editor.destroy();
  });

  it("serializes edited document state back to Markdown", () => {
    const editor = new Editor({
      extensions: markdownEditorExtensions,
      content: "Plain text",
      contentType: "markdown",
    });

    editor.chain().selectAll().toggleBold().run();

    expect(editor.getMarkdown()).toBe("**Plain text**");

    editor.destroy();
  });
});
