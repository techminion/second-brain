import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NoteTags } from "./note-tags";

const mutate = vi.fn();
const fetchTags = vi.fn();

vi.mock("../hooks/use-note-mutations", () => ({
  useNoteTagMutation: () => ({ isPending: false, mutate }),
}));
vi.mock("@/features/search/search-api", () => ({ fetchTags: () => fetchTags() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function renderTags(tags = [{ id: "t1", name: "Research" }]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<NoteTags noteId="n1" tags={tags} />, { wrapper });
}

afterEach(() => vi.clearAllMocks());

describe("NoteTags", () => {
  it("renders chips linking to the tag view, removable by name", () => {
    fetchTags.mockResolvedValue([]);
    renderTags();

    expect(screen.getByRole("link", { name: "#Research" })).toHaveAttribute("href", "/tags/t1");
    fireEvent.click(screen.getByRole("button", { name: "Remove tag Research" }));
    expect(mutate).toHaveBeenCalledWith({ noteId: "n1", remove: "t1" }, expect.any(Object));
  });

  it("creates a new tag inline from the typed name (FR-TAG-2)", () => {
    fetchTags.mockResolvedValue([]);
    renderTags([]);

    const input = screen.getByRole("combobox", { name: "Add tag" });
    fireEvent.change(input, { target: { value: "#ideas " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mutate).toHaveBeenCalledWith({ add: "ideas", noteId: "n1" }, expect.any(Object));
    expect(input).toHaveValue("");
  });

  it("suggests existing tags by prefix, excluding applied ones, and applies the highlighted one", async () => {
    fetchTags.mockResolvedValue([
      { id: "t1", name: "Research" },
      { id: "t2", name: "Reading" },
      { id: "t3", name: "Travel" },
    ]);
    renderTags();

    const input = screen.getByRole("combobox", { name: "Add tag" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "re" } });

    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
    expect(screen.getByRole("option", { name: "#Reading" })).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mutate).toHaveBeenCalledWith({ add: "Reading", noteId: "n1" }, expect.any(Object));
  });
});
