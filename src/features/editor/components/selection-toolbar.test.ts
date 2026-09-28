import { describe, expect, it } from "vitest";

import { normalizeLinkTarget } from "./selection-toolbar";

describe("normalizeLinkTarget (EDIT-09)", () => {
  it("keeps web and mail addresses", () => {
    expect(normalizeLinkTarget("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(normalizeLinkTarget("http://example.com")).toBe("http://example.com");
    expect(normalizeLinkTarget("mailto:me@example.com")).toBe("mailto:me@example.com");
  });

  it("assumes https for a bare host", () => {
    expect(normalizeLinkTarget("  example.com/docs ")).toBe("https://example.com/docs");
  });

  it("refuses executable and non-web schemes", () => {
    for (const hostile of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      expect(normalizeLinkTarget(hostile), hostile).toBeNull();
    }
  });

  it("refuses empty input and whitespace inside the address", () => {
    expect(normalizeLinkTarget("   ")).toBeNull();
    expect(normalizeLinkTarget("https://exa mple.com")).toBeNull();
  });
});
