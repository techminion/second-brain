import { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it } from "vitest";

import { markdownEditorExtensions } from "./markdown-editor-extensions";
import { looksLikeMarkdown, markdownPastePluginKey } from "./markdown-paste-extension";
import { serializeEditorMarkdown } from "./markdown-round-trip";

describe("looksLikeMarkdown (EDIT-11)", () => {
  it.each([
    ["heading", "# Title\n\nBody"],
    ["bullet list", "- one\n- two"],
    ["task list", "- [ ] todo"],
    ["ordered list", "1. first\n2. second"],
    ["quote", "> quoted"],
    ["fence", "```ts\nconst a = 1;\n```"],
    ["table", "| a | b |\n| --- | --- |\n| 1 | 2 |"],
    ["rule", "above\n\n---\n\nbelow"],
    ["strong", "this is **important**"],
    ["emphasis", "an *aside* here"],
    ["code span", "run `npm test` now"],
    ["link", "see [docs](https://example.com)"],
  ])("detects %s", (_name, text) => {
    expect(looksLikeMarkdown(text)).toBe(true);
  });

  it.each([
    ["plain sentence", "Just a sentence, nothing more."],
    ["url", "https://example.com/a_b_c"],
    ["math-ish asterisks", "2 * 3 * 4 = 24"],
    ["snake_case", "call my_function_name here"],
    ["wiki link only", "see [[Project Plan]]"],
    ["hyphenated line", "well-known self-evident"],
  ])("leaves %s as plain text", (_name, text) => {
    expect(looksLikeMarkdown(text)).toBe(false);
  });
});

describe("markdown paste in the editor (EDIT-11)", () => {
  let editor: Editor | undefined;
  afterEach(() => editor?.destroy());

  function paste(target: Editor, types: Record<string, string>): boolean {
    const clipboardData = {
      getData: (type: string) => types[type] ?? "",
      types: Object.keys(types),
    } as unknown as DataTransfer;
    const event = { clipboardData } as ClipboardEvent;
    const handle = markdownPastePluginKey.get(target.state)?.props.handlePaste;
    return Boolean(handle?.call(undefined as never, target.view, event, target.state.doc.slice(0)));
  }

  function create(markdown = "") {
    editor = new Editor({
      content: markdown,
      contentType: "markdown",
      extensions: markdownEditorExtensions,
    });
    return editor;
  }

  it("parses pasted markdown text into blocks", () => {
    const target = create();
    expect(paste(target, { "text/plain": "## Plan\n\n- [ ] ship\n\n**done** soon" })).toBe(true);
    expect(serializeEditorMarkdown(target).trim()).toBe("## Plan\n\n- [ ] ship\n\n**done** soon");
  });

  it("defers to the HTML parser when rich text is on the clipboard", () => {
    const target = create();
    expect(paste(target, { "text/html": "<p><b>x</b></p>", "text/plain": "**x**" })).toBe(false);
  });

  it("pastes literally inside a code block", () => {
    const target = create("```\n\n```");
    target.commands.setTextSelection(2);
    expect(target.state.selection.$from.parent.type.name).toBe("codeBlock");
    expect(paste(target, { "text/plain": "# not a heading" })).toBe(false);
  });

  it("strips raw HTML inside pasted markdown, as on load (EDIT-16)", () => {
    const target = create();
    expect(
      paste(target, {
        "text/plain": '# Title\n\n<img src=x onerror="alert(1)"> and [x](javascript:alert(1))',
      }),
    ).toBe(true);
    const dom = target.view.dom;
    expect(dom.querySelector("img[onerror], script")).toBeNull();
    for (const anchor of dom.querySelectorAll("a")) {
      expect(anchor.getAttribute("href") ?? "").not.toMatch(/^\s*javascript:/i);
    }
  });

  it("leaves plain text to the default paste", () => {
    const target = create();
    expect(paste(target, { "text/plain": "just words" })).toBe(false);
  });
});
