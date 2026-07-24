import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("renders the empty-state onboarding for a brand-new graph (FR-AUTH-5)", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Your knowledge graph is empty" }),
    ).toBeInTheDocument();
  });
});
