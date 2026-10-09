import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import HomePage, { metadata } from "./page";

vi.mock("@/features/notes/components/home-dashboard", () => ({
  HomeDashboard: ({ emptyState }: { emptyState: ReactNode }) => (
    <div data-testid="home-dashboard">{emptyState}</div>
  ),
}));
vi.mock("@/features/notes/components/new-note-button", () => ({
  NewNoteButton: () => <button type="button">New note</button>,
}));

describe("HomePage", () => {
  it("renders the Home dashboard (UX-07), which owns the empty-state decision", () => {
    render(<HomePage />);

    expect(screen.getByTestId("home-dashboard")).toBeInTheDocument();
  });

  it("hands the dashboard the onboarding with a New note action for zero notes", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Your knowledge graph is empty" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New note" })).toBeInTheDocument();
  });

  it("titles the page Home", () => {
    expect(metadata.title).toBe("Home");
  });
});
