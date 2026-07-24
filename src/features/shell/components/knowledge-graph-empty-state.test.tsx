import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KnowledgeGraphEmptyState } from "./knowledge-graph-empty-state";

describe("KnowledgeGraphEmptyState", () => {
  it("renders an accessible landmark with a heading", () => {
    render(<KnowledgeGraphEmptyState />);

    const region = screen.getByRole("region", { name: "Your knowledge graph is empty" });
    expect(
      within(region).getByRole("heading", { name: "Your knowledge graph is empty" }),
    ).toBeInTheDocument();
  });

  it("teaches the three FR-AUTH-5 onboarding moves", () => {
    render(<KnowledgeGraphEmptyState />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(screen.getByText("Create your first note")).toBeInTheDocument();
    expect(screen.getByText("Link ideas together")).toBeInTheDocument();
    expect(screen.getByText("Find anything")).toBeInTheDocument();
  });

  it("surfaces the note, wiki-link, and command-palette shortcuts", () => {
    render(<KnowledgeGraphEmptyState />);

    expect(screen.getByText("⌘N")).toBeInTheDocument();
    expect(screen.getByText("[[")).toBeInTheDocument();
    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });
});
