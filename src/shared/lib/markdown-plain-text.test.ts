import { describe, expect, it } from "vitest";

import { markdownToPlainText } from "./markdown-plain-text";

describe("markdownToPlainText", () => {
  it.each([
    ["# Goals\n\nShip **search** and the [[Graph view]].", "Goals Ship search and the Graph view."],
    ["- [ ] Polish the UI\n- [x] Full-text search", "Polish the UI Full-text search"],
    ["1. First\n2) Second", "First Second"],
    ["> Notes are for *thinking*, not _storing_.", "Notes are for thinking, not storing."],
    ["See [the docs](https://example.com) and ![a chart](x.png)", "See the docs and a chart"],
    ["```ts\nconst layout = force(nodes);\n```", "const layout = force(nodes);"],
    ["Use `npm test` ~~never~~", "Use npm test never"],
    ["| Book | Status |\n| --- | :---: |\n| BASB | Done |", "Book Status BASB Done"],
    ["Above\n\n---\n\nBelow", "Above Below"],
  ])("%j → %j", (markdown, plain) => {
    expect(markdownToPlainText(markdown)).toBe(plain);
  });

  it("keeps snake_case words and lone asterisks intact", () => {
    expect(markdownToPlainText("rename snake_case_name; 2 * 3")).toBe(
      "rename snake_case_name; 2 * 3",
    );
  });

  it("returns an empty string for blank input", () => {
    expect(markdownToPlainText("  \n\n ")).toBe("");
  });
});
