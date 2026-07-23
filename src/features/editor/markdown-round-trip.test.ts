import { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import { markdownEditorExtensions } from "./markdown-editor-extensions";
import {
  detectUnsupportedMarkdown,
  normalizeMarkdown,
  serializeEditorMarkdown,
} from "./markdown-round-trip";

describe("normalizeMarkdown", () => {
  // Constructs the editor supports must survive one normalization pass with
  // their meaning intact (FR-NOTE-2). Where the serializer canonicalizes
  // (underscore emphasis, setext headings, autolinks), the expected output
  // records the canonical form — semantic equivalence, not byte equality.
  const supported: [string, string, string][] = [
    [
      "heading levels",
      "# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6",
      "# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6",
    ],
    [
      "emphasis and inline code",
      "**bold** *italic* ~~strike~~ `code` ***bolditalic***",
      "**bold** *italic* ~~strike~~ `code` ***bolditalic***",
    ],
    [
      "links, with autolinks canonicalized",
      "[Anthropic](https://anthropic.com) and <https://autolink.dev>",
      "[Anthropic](https://anthropic.com) and [https://autolink.dev](https://autolink.dev)",
    ],
    [
      "images keep their source URL",
      "![alt text](https://example.com/img.png)",
      "![alt text](https://example.com/img.png)",
    ],
    ["blockquotes", "> quoted line\n>\n> second para", "> quoted line\n>\n> second para"],
    [
      "nested bullet lists",
      "- one\n- two\n  - two.a\n  - two.b\n- three",
      "- one\n- two\n  - two.a\n  - two.b\n- three",
    ],
    [
      "ordered lists, nesting reindented",
      "1. first\n2. second\n   1. nested\n3. third",
      "1. first\n2. second\n  1. nested\n3. third",
    ],
    [
      "fenced code with language",
      "```ts\nconst x: number = 1;\n```",
      "```ts\nconst x: number = 1;\n```",
    ],
    ["horizontal rule", "above\n\n---\n\nbelow", "above\n\n---\n\nbelow"],
    ["hard line break", "line one  \nline two", "line one  \nline two"],
    [
      "escaped punctuation stays literal",
      "\\*not italic\\* and 1\\. not a list",
      "\\*not italic\\* and 1. not a list",
    ],
    ["setext headings canonicalized to ATX", "Title\n=====", "# Title"],
    ["underscore emphasis canonicalized", "_italic_ and __bold__", "*italic* and **bold**"],
    [
      "wiki links survive unescaped",
      "[[Second Brain]] links to [[Another Note]]",
      "[[Second Brain]] links to [[Another Note]]",
    ],
  ];

  it.each(supported)("%s", (_name, input, expected) => {
    expect(normalizeMarkdown(input)).toBe(expected);
  });

  it.each(supported)("is a fixed point after one pass: %s", (_name, input) => {
    const once = normalizeMarkdown(input);
    expect(normalizeMarkdown(once)).toBe(once);
  });
});

describe("serializeEditorMarkdown", () => {
  it("repairs wiki-link escaping the plain-text serializer introduces", () => {
    const editor = new Editor({
      content: "See [[Second Brain]]",
      contentType: "markdown",
      extensions: markdownEditorExtensions,
    });

    expect(editor.getMarkdown()).toBe("See \\[\\[Second Brain\\]\\]");
    expect(serializeEditorMarkdown(editor)).toBe("See [[Second Brain]]");

    editor.destroy();
  });
});

describe("editor schema conformance", () => {
  it("does not register the underline mark (no standard markdown form)", () => {
    const editor = new Editor({
      content: "plain",
      contentType: "markdown",
      extensions: markdownEditorExtensions,
    });

    expect(editor.extensionManager.extensions.some((ext) => ext.name === "underline")).toBe(false);

    editor.destroy();
  });
});

describe("detectUnsupportedMarkdown", () => {
  it("flags GFM tables", () => {
    expect(detectUnsupportedMarkdown("| a | b |\n|---|---|\n| 1 | 2 |")).toEqual(["table"]);
  });

  it("flags task-list checkboxes", () => {
    expect(detectUnsupportedMarkdown("- [ ] todo\n- [x] done")).toEqual(["task-list"]);
  });

  it("flags raw HTML tags", () => {
    expect(detectUnsupportedMarkdown("text with <sup>sup</sup> inline")).toEqual(["html"]);
    expect(detectUnsupportedMarkdown("<div>\nblock\n</div>")).toEqual(["html"]);
  });

  it("does not mistake autolinks for HTML", () => {
    expect(detectUnsupportedMarkdown("visit <https://autolink.dev> now")).toEqual([]);
  });

  it("reports multiple reasons together", () => {
    expect(detectUnsupportedMarkdown("|---|---|\n- [ ] todo\n<b>bold</b>")).toEqual([
      "table",
      "task-list",
      "html",
    ]);
  });

  it("passes clean supported markdown", () => {
    expect(
      detectUnsupportedMarkdown(
        "# Title\n\n**bold** [[wiki]] [link](https://a.dev)\n\n- list\n\n```ts\ncode\n```",
      ),
    ).toEqual([]);
  });
});
