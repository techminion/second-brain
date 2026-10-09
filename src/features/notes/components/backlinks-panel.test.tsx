import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BacklinksPanel } from "./backlinks-panel";

let pathname = "/notes/n1";
const useBacklinks = vi.fn();

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("../hooks/use-backlinks", () => ({
  useBacklinks: (id: string | undefined) => useBacklinks(id),
}));

afterEach(() => {
  pathname = "/notes/n1";
  vi.clearAllMocks();
});

describe("BacklinksPanel", () => {
  it("lists linking notes with snippets and links to them (BACK-03/04)", () => {
    useBacklinks.mockReturnValue({
      data: [{ object: { id: "s1", title: "Source" }, snippet: "…see [[Target]] here…" }],
      isError: false,
      isPending: false,
    });

    render(<BacklinksPanel />);

    expect(useBacklinks).toHaveBeenCalledWith("n1");
    expect(screen.getByRole("link", { name: /Source/ })).toHaveAttribute("href", "/notes/s1");
    // UX-08: backlink snippets are shown without markdown syntax.
    expect(screen.getByText("…see Target here…")).toBeInTheDocument();
  });

  it("strips markdown from backlink snippets (UX-08)", () => {
    useBacklinks.mockReturnValue({
      data: [
        {
          object: { id: "s1", title: "Source" },
          snippet: "## Plan\n- **ship** [[Target]] via [docs](https://x) `code`",
        },
      ],
      isError: false,
      isPending: false,
    });

    render(<BacklinksPanel />);

    const link = screen.getByRole("link", { name: /Source/ });
    expect(link).toHaveTextContent("Plan ship Target via docs code");
    for (const syntax of ["#", "**", "[[", "](", "`"]) {
      expect(link.textContent).not.toContain(syntax);
    }
  });

  it("teaches linking when there are no backlinks (BACK-05)", () => {
    useBacklinks.mockReturnValue({ data: [], isError: false, isPending: false });

    render(<BacklinksPanel />);

    expect(screen.getByText(/No notes link here yet/)).toBeInTheDocument();
  });

  it("explains itself away from note pages", () => {
    pathname = "/settings";
    useBacklinks.mockReturnValue({ isPending: true });

    render(<BacklinksPanel />);

    expect(useBacklinks).toHaveBeenCalledWith(undefined);
    expect(screen.getByText("Open a note to see what links to it.")).toBeInTheDocument();
  });
});
