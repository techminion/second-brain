import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/shared/lib/errors";

import { GET as GET_BACKLINKS } from "../notes/[id]/backlinks/route";
import { GET as GET_LOCAL } from "../notes/[id]/graph/route";
import { GET as GET_TITLES } from "../search/titles/route";
import { GET } from "./route";

const resolveSessionUserId = vi.fn();
const graphService = { getGraph: vi.fn(), getLocalGraph: vi.fn() };
const noteService = { getBacklinks: vi.fn() };
const searchService = { suggestNoteTitles: vi.fn() };

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));
vi.mock("@/features/graph/graph-service", () => ({
  createGraphService: () => Promise.resolve(graphService),
}));
vi.mock("@/features/notes/note-service", () => ({
  createNoteService: () => Promise.resolve(noteService),
}));
vi.mock("@/features/search/search-service", () => ({
  createSearchService: () => Promise.resolve(searchService),
}));

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("connect routes", () => {
  beforeEach(() => {
    resolveSessionUserId.mockResolvedValue("user-1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("GET /api/graph passes tag and folder filters", async () => {
    graphService.getGraph.mockResolvedValue({ edges: [], nodes: [] });

    await GET(new Request("https://x.test/api/graph?tagId=t1&folderId=f1"));

    expect(graphService.getGraph).toHaveBeenCalledWith("user-1", { folderId: "f1", tagId: "t1" });
  });

  it("GET /api/notes/[id]/graph passes depth and maps NotFound", async () => {
    graphService.getLocalGraph.mockResolvedValueOnce({ edges: [], nodes: [] });
    await GET_LOCAL(new Request("https://x.test/api/notes/n1/graph?depth=2"), params("n1"));
    expect(graphService.getLocalGraph).toHaveBeenCalledWith("user-1", "n1", 2);

    graphService.getLocalGraph.mockRejectedValueOnce(new NotFoundError("Note not found"));
    const response = await GET_LOCAL(
      new Request("https://x.test/api/notes/zz/graph"),
      params("zz"),
    );
    expect(response.status).toBe(404);
  });

  it("GET /api/notes/[id]/backlinks returns backlinks", async () => {
    noteService.getBacklinks.mockResolvedValue([{ object: { id: "s1" }, snippet: "x" }]);

    const response = await GET_BACKLINKS(
      new Request("https://x.test/api/notes/n1/backlinks"),
      params("n1"),
    );

    expect(noteService.getBacklinks).toHaveBeenCalledWith("user-1", "n1");
    expect(await response.json()).toEqual({ data: [{ object: { id: "s1" }, snippet: "x" }] });
  });

  it("GET /api/search/titles forwards the query and limit", async () => {
    searchService.suggestNoteTitles.mockResolvedValue([]);

    await GET_TITLES(new Request("https://x.test/api/search/titles?q=pla&limit=5"));

    expect(searchService.suggestNoteTitles).toHaveBeenCalledWith("user-1", "pla", 5);
  });
});
