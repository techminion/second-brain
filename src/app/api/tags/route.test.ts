import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/shared/lib/errors";

import { DELETE } from "../notes/[id]/tags/[tagId]/route";
import { POST } from "../notes/[id]/tags/route";
import { GET as GET_OBJECTS } from "./[id]/objects/route";
import { GET } from "./route";

const resolveSessionUserId = vi.fn();
const searchService = { listByTag: vi.fn(), listTags: vi.fn() };
const noteService = { addTag: vi.fn(), removeTag: vi.fn() };

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));
vi.mock("@/features/search/search-service", () => ({
  createSearchService: () => Promise.resolve(searchService),
}));
vi.mock("@/features/notes/note-service", () => ({
  createNoteService: () => Promise.resolve(noteService),
}));

describe("tag routes", () => {
  beforeEach(() => {
    resolveSessionUserId.mockResolvedValue("user-1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("GET /api/tags lists the user's tags", async () => {
    searchService.listTags.mockResolvedValue([{ id: "t1", name: "a" }]);

    const response = await GET(new Request("https://x.test/api/tags"));

    expect(searchService.listTags).toHaveBeenCalledWith("user-1");
    expect(await response.json()).toEqual({ data: [{ id: "t1", name: "a" }] });
  });

  it("GET /api/tags/[id]/objects pages and 404s unknown tags", async () => {
    searchService.listByTag.mockResolvedValueOnce({ items: [] });
    await GET_OBJECTS(new Request("https://x.test/api/tags/t1/objects?cursor=c"), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(searchService.listByTag).toHaveBeenCalledWith("user-1", "t1", { cursor: "c" });

    searchService.listByTag.mockRejectedValueOnce(new NotFoundError("Tag not found"));
    const response = await GET_OBJECTS(new Request("https://x.test/api/tags/zz/objects"), {
      params: Promise.resolve({ id: "zz" }),
    });
    expect(response.status).toBe(404);
  });

  it("POST /api/notes/[id]/tags adds by name; DELETE removes by id", async () => {
    noteService.addTag.mockResolvedValue({ id: "n1", tags: [] });
    await POST(
      new Request("https://x.test/api/notes/n1/tags", {
        body: JSON.stringify({ name: "ideas" }),
        method: "POST",
      }),
      { params: Promise.resolve({ id: "n1" }) },
    );
    expect(noteService.addTag).toHaveBeenCalledWith("user-1", "n1", "ideas");

    noteService.removeTag.mockResolvedValue({ id: "n1", tags: [] });
    await DELETE(new Request("https://x.test/api/notes/n1/tags/t1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "n1", tagId: "t1" }),
    });
    expect(noteService.removeTag).toHaveBeenCalledWith("user-1", "n1", "t1");
  });

  it("401s without a session", async () => {
    resolveSessionUserId.mockResolvedValue(null);

    expect((await GET(new Request("https://x.test/api/tags"))).status).toBe(401);
  });
});
