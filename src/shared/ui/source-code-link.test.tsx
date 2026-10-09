import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourceCodeLink, sourceCodeUrl, sourceRepositoryUrl } from "./source-code-link";

describe("SourceCodeLink (AGPL-3.0 §13)", () => {
  it("links to the repository with an accessible label", () => {
    render(<SourceCodeLink commitSha="" />);

    const link = screen.getByRole("link", {
      name: "Source code (AGPL-3.0) on GitHub, opens in a new tab",
    });
    expect(link).toHaveAttribute("href", "https://github.com/techminion/second-brain");
    // WCAG 2.5.3: the accessible name starts with the visible text.
    expect(link.textContent).toBe("Source code (AGPL-3.0)");
    expect(link.getAttribute("aria-label")?.startsWith(link.textContent ?? "")).toBe(true);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links to the deployed commit when the build knows it", () => {
    expect(sourceCodeUrl("a2fa765")).toBe(`${sourceRepositoryUrl}/tree/a2fa765`);
  });

  it("ignores a malformed commit value", () => {
    expect(sourceCodeUrl("main; rm")).toBe(sourceRepositoryUrl);
  });
});
