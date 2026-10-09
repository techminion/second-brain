import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseSnippet, SearchSnippet } from "./search-snippet";
import { SearchView } from "./search-view";

const api = vi.hoisted(() => ({ fetchSearchResults: vi.fn() }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("../search-api", () => ({
  fetchSearchResults: (...args: unknown[]) => api.fetchSearchResults(...args),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/search",
  useRouter: () => router,
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function result(id: string, title: string, snippet: string) {
  return {
    matchType: "fulltext",
    object: {
      createdAt: "2026-09-01T00:00:00Z",
      id,
      tags: [{ id: "t1", name: "work" }],
      title,
      type: "note",
      updatedAt: "2026-09-01T00:00:00Z",
    },
    score: 0.1,
    snippet,
  };
}

beforeEach(() => {
  api.fetchSearchResults.mockReset();
  router.replace.mockReset();
});

describe("parseSnippet (FTS-05, ADR-36)", () => {
  it("splits matches out of the marker-delimited snippet", () => {
    expect(parseSnippet("set the \u0002roadmap\u0003 for \u0002Q3\u0003.")).toEqual([
      { match: false, text: "set the " },
      { match: true, text: "roadmap" },
      { match: false, text: " for " },
      { match: true, text: "Q3" },
      { match: false, text: "." },
    ]);
  });

  it("never lets markers or markup through as markup", () => {
    const { container } = render(
      <SearchSnippet snippet={'<img src=x onerror="alert(1)"> \u0002<b>hit</b>\u0003\u0003'} />,
    );
    expect(container.querySelector("img, b")).toBeNull();
    expect(container.querySelector("mark")?.textContent).toBe("<b>hit</b>");
    expect(container.textContent).not.toContain("\u0002");
    expect(container.textContent).not.toContain("\u0003");
  });
});

describe("SearchView (FTS-05/09)", () => {
  it("explains the syntax before a query is entered, without searching", () => {
    render(<SearchView initialQuery="" />, { wrapper });

    expect(screen.getByText(/exact phrase/)).toBeInTheDocument();
    expect(api.fetchSearchResults).not.toHaveBeenCalled();
  });

  it("lists results with highlighted snippets, tags and links", async () => {
    api.fetchSearchResults.mockResolvedValue({
      items: [result("n1", "Quarterly planning", "the \u0002roadmap\u0003 for Q3")],
    });
    render(<SearchView initialQuery="roadmap" />, { wrapper });

    const list = await screen.findByRole("list", { name: "Search results" });
    const link = screen.getByRole("link", { name: /Quarterly planning/ });
    expect(link).toHaveAttribute("href", "/notes/n1");
    expect(list.querySelector("mark")).toHaveTextContent("roadmap");
    expect(list).toHaveTextContent("#work");
    expect(api.fetchSearchResults).toHaveBeenCalledWith("roadmap", {
      cursor: undefined,
      limit: 20,
    });
  });

  it("renders markdown snippets as clean text with one highlight (UX-08)", async () => {
    api.fetchSearchResults.mockResolvedValue({
      items: [
        result(
          "n1",
          "Plan",
          "## \u0002Roadmap\u0003 - **ship** [[Q3 plan]] via [docs](https://x) `npm test`",
        ),
      ],
    });
    render(<SearchView initialQuery="roadmap" />, { wrapper });

    const list = await screen.findByRole("list", { name: "Search results" });
    const marks = list.querySelectorAll("mark");
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent("Roadmap");
    // The snippet is the mark's container (the tag chips, e.g. "#work", sit elsewhere).
    const snippet = marks[0].parentElement;
    expect(snippet).toHaveTextContent("Roadmap ship Q3 plan via docs npm test");
    for (const syntax of ["#", "**", "[[", "](", "`"]) {
      expect(snippet?.textContent).not.toContain(syntax);
    }
  });

  it("renders a script in a snippet as text (09_SECURITY T4)", async () => {
    api.fetchSearchResults.mockResolvedValue({
      items: [result("n1", "Evil", "<script>alert(1)</script> \u0002hit\u0003")],
    });
    render(<SearchView initialQuery="hit" />, { wrapper });

    const list = await screen.findByRole("list", { name: "Search results" });
    expect(list.querySelector("script")).toBeNull();
    expect(list).toHaveTextContent("<script>alert(1)</script> hit");
  });

  it("shows the no-results state", async () => {
    api.fetchSearchResults.mockResolvedValue({ items: [] });
    render(<SearchView initialQuery="zzz" />, { wrapper });

    expect(await screen.findByText(/No notes match “zzz”/)).toBeInTheDocument();
  });

  it("shows an error state when search fails", async () => {
    api.fetchSearchResults.mockRejectedValue(new Error("down"));
    render(<SearchView initialQuery="roadmap" />, { wrapper });

    expect(await screen.findByText(/Search is unavailable/)).toBeInTheDocument();
  });

  it("loads more results with the next cursor", async () => {
    api.fetchSearchResults
      .mockResolvedValueOnce({ items: [result("n1", "One", "a")], nextCursor: "c2" })
      .mockResolvedValueOnce({ items: [result("n2", "Two", "b")] });
    render(<SearchView initialQuery="x" />, { wrapper });

    fireEvent.click(await screen.findByRole("button", { name: "Load more results" }));

    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(2));
    expect(api.fetchSearchResults).toHaveBeenLastCalledWith("x", { cursor: "c2", limit: 20 });
    expect(screen.queryByRole("button", { name: "Load more results" })).not.toBeInTheDocument();
  });

  it("syncs the typed query into the URL after a pause", async () => {
    api.fetchSearchResults.mockResolvedValue({ items: [] });
    render(<SearchView initialQuery="" />, { wrapper });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search notes" }), {
      target: { value: "  graph view " },
    });

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/search?q=graph%20view", { scroll: false }),
    );
  });

  it("moves between the field and results with the arrow keys", async () => {
    api.fetchSearchResults.mockResolvedValue({
      items: [result("n1", "One", "a"), result("n2", "Two", "b")],
    });
    render(<SearchView initialQuery="x" />, { wrapper });
    const input = screen.getByRole("searchbox", { name: "Search notes" });
    await screen.findByRole("list", { name: "Search results" });
    const [first, second] = screen.getAllByRole("link");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: "ArrowUp" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowUp" });
    expect(input).toHaveFocus();
  });
});
