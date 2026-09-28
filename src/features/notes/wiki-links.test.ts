import { describe, expect, it } from "vitest";

import { extractWikiLinkTitles, findWikiLinks, wikiLinkSnippet } from "./wiki-links";

describe("extractWikiLinkTitles (LINK-01)", () => {
  it.each([
    ["single link", "See [[Alpha]].", ["Alpha"]],
    ["several links in order", "[[B]] then [[A]] then [[C]]", ["B", "A", "C"]],
    ["trims the title", "[[  Spaced Title  ]]", ["Spaced Title"]],
    ["dedupes case-insensitively, first spelling wins", "[[Alpha]] [[alpha]] [[ALPHA]]", ["Alpha"]],
    ["keeps pipes as part of the title (no alias syntax)", "[[A|b]]", ["A|b"]],
    ["unicode titles", "[[Café ☕]] [[日本語]]", ["Café ☕", "日本語"]],
    ["empty and whitespace-only links are ignored", "[[]] [[   ]]", []],
    ["nested brackets are not links", "[[a [b] c]] [[[x]]]", ["x"]],
    ["links never span lines", "[[multi\nline]]", []],
    ["single brackets are not links", "[not] [a link](https://x.dev)", []],
    ["inline code is excluded", "`[[Code]]` and [[Real]]", ["Real"]],
    ["double-backtick code is excluded", "``a [[Code]] ` b`` [[Real]]", ["Real"]],
    ["fenced code is excluded", "```\n[[Code]]\n```\n[[Real]]", ["Real"]],
    ["tilde fences and indented fences", "  ~~~md\n[[Code]]\n  ~~~\n[[Real]]", ["Real"]],
    ["an unclosed fence swallows the rest", "```\n[[Code]]", []],
    ["links inside lists and tasks", "- [ ] ship [[Launch]]\n1. read [[Book]]", ["Launch", "Book"]],
    ["adjacent links", "[[A]][[B]]", ["A", "B"]],
  ])("%s", (_name, markdown, expected) => {
    expect(extractWikiLinkTitles(markdown)).toEqual(expected);
  });

  it("reports offsets into the original text", () => {
    const markdown = "x `[[no]]` [[Yes]] y";
    const [link] = findWikiLinks(markdown);

    expect(markdown.slice(link.start, link.end)).toBe("[[Yes]]");
  });
});

describe("wikiLinkSnippet", () => {
  it("returns trimmed context around the first matching link", () => {
    const body = `${"a".repeat(100)} before [[Target]] after ${"b".repeat(100)}`;
    const snippet = wikiLinkSnippet(body, "target", 10);

    expect(snippet).toBe("…aa before [[Target]] after bbb…");
  });

  it("collapses whitespace and handles links at the edges", () => {
    expect(wikiLinkSnippet("[[T]]\n\nnext line", "T")).toBe("[[T]] next line");
  });

  it("is empty when the note does not link to the title", () => {
    expect(wikiLinkSnippet("no links here", "T")).toBe("");
  });
});
