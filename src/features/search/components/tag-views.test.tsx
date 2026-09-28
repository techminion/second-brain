import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/lib/api-client";

import { SidebarTagList } from "./sidebar-tag-list";
import { TagBrowser } from "./tag-browser";

const useTags = vi.fn();
const useObjectsByTag = vi.fn();

vi.mock("../hooks/use-tags", () => ({
  useObjectsByTag: (id: string) => useObjectsByTag(id),
  useTags: () => useTags(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/tags/t1" }));

const tags = [
  { id: "t1", name: "Research" },
  { id: "t2", name: "Travel" },
];

afterEach(() => vi.clearAllMocks());

describe("SidebarTagList", () => {
  it("links every tag and marks the current one", () => {
    useTags.mockReturnValue({ data: tags, isPending: false });
    render(<SidebarTagList />);

    expect(screen.getByRole("link", { name: "#Research" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "#Travel" })).toHaveAttribute("href", "/tags/t2");
  });

  it("shows an empty state", () => {
    useTags.mockReturnValue({ data: [], isPending: false });
    render(<SidebarTagList />);

    expect(screen.getByText("No tags yet.")).toBeInTheDocument();
  });
});

describe("TagBrowser", () => {
  it("lists tagged objects across types with filter chips", () => {
    useTags.mockReturnValue({ data: tags });
    useObjectsByTag.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              { id: "n1", tags: tags.slice(0, 1), title: "Plan", type: "note" },
              { id: "a1", tags: [], title: "scan.pdf", type: "attachment" },
            ],
          },
        ],
      },
      isPending: false,
    });

    render(<TagBrowser tagId="t1" />);

    expect(screen.getByRole("heading", { name: "#Research" })).toBeInTheDocument();
    expect(useObjectsByTag).toHaveBeenCalledWith("t1");
    expect(screen.getByRole("link", { name: /Plan/ })).toHaveAttribute("href", "/notes/n1");
    expect(screen.getByText("scan.pdf")).toBeInTheDocument();
    const filters = screen.getByRole("navigation", { name: "Filter by tag" });
    expect(filters.querySelector('[aria-current="page"]')).toHaveTextContent("#Research");
  });

  it("explains a missing tag", () => {
    useTags.mockReturnValue({ data: [] });
    useObjectsByTag.mockReturnValue({ error: new ApiError(404, "NOT_FOUND", "gone") });

    render(<TagBrowser tagId="zz" />);

    expect(screen.getByRole("status")).toHaveTextContent("doesn’t exist");
  });
});
