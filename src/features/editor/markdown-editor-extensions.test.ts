import { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import { markdownEditorExtensions } from "./markdown-editor-extensions";

function typeText(editor: Editor, text: string) {
  for (const character of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp("handleTextInput", (handler) =>
      handler(editor.view, from, to, character, () =>
        editor.state.tr.insertText(character, from, to),
      ),
    );

    if (!handled) {
      editor.view.dispatch(editor.state.tr.insertText(character, from, to));
    }
  }
}

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

  it.each([
    {
      input: "# Heading",
      markdown: "# Heading",
      node: { attrs: { level: 1 }, type: "heading" },
    },
    {
      input: "**bold**",
      markdown: "**bold**",
      node: { marks: [{ type: "bold" }], text: "bold", type: "text" },
    },
    {
      input: "*italic*",
      markdown: "*italic*",
      node: { marks: [{ type: "italic" }], text: "italic", type: "text" },
    },
    {
      input: "`code`",
      markdown: "`code`",
      node: { marks: [{ type: "code" }], text: "code", type: "text" },
    },
  ])("live-formats $markdown as it is typed", ({ input, markdown, node }) => {
    const editor = new Editor({
      extensions: markdownEditorExtensions,
    });

    typeText(editor, input);

    const document = editor.getJSON();
    const formattedNode =
      node.type === "heading" ? document.content?.[0] : document.content?.[0]?.content?.[0];
    expect(formattedNode).toMatchObject(node);
    expect(editor.getMarkdown().trimEnd()).toBe(markdown);

    editor.destroy();
  });
});
