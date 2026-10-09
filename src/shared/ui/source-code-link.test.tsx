import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourceCodeLink, sourceCodeUrl, sourceRepositoryUrl } from "./source-code-link";

describe("SourceCodeLink (AGPL-3.0 §13)", () => {
  it("links to the repository with an accessible label", () => {
    render(<SourceCodeLink commitSha="" />);

    const link = screen.getByRole("link", {
      name: "Source code on GitHub (AGPL-3.0, opens in a new tab)",
    });
    expect(link).toHaveAttribute("href", "https://github.com/techminion/second-brain");
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
