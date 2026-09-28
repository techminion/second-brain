import { describe, expect, it } from "vitest";

import { codeLowlight } from "./code-languages";

describe("codeLowlight (EDIT-06)", () => {
  it("registers the curated languages under their common fence aliases", () => {
    for (const alias of ["ts", "js", "py", "sh", "bash", "html", "json", "yml", "sql", "rs"]) {
      expect(codeLowlight.registered(alias), alias).toBe(true);
    }
  });

  it("leaves unknown languages unregistered, so they render unhighlighted", () => {
    expect(codeLowlight.registered("cobol")).toBe(false);
  });

  it("highlights keywords and comments", () => {
    const tree = codeLowlight.highlight("typescript", "const a = 1; // note");
    const classes = JSON.stringify(tree);
    expect(classes).toContain("hljs-keyword");
    expect(classes).toContain("hljs-comment");
  });
});
