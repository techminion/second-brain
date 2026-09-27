import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const resolveSessionUserId = vi.fn();
const service = { listTrash: vi.fn() };

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));

vi.mock("@/features/notes/note-service", () => ({
  createNoteService: () => Promise.resolve(service),
}));

describe("/api/notes/trash", () => {
  beforeEach(() => {
    resolveSessionUserId.mockResolvedValue("user-1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    service.listTrash.mockReset();
  });

  it("lists the session user's trash with pagination parsed from the query", async () => {
    const page = { items: [{ deletedAt: "2026-07-24T00:00:00.000Z", id: "n1" }] };
    service.listTrash.mockResolvedValue(page);

    const response = await GET(
      new Request("https://example.test/api/notes/trash?cursor=c&limit=5"),
    );

    expect(service.listTrash).toHaveBeenCalledWith("user-1", { cursor: "c", limit: 5 });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: page });
  });

  it("returns 401 without a session and never reaches the service", async () => {
    resolveSessionUserId.mockResolvedValue(null);

    const response = await GET(new Request("https://example.test/api/notes/trash"));

    expect(response.status).toBe(401);
    expect(service.listTrash).not.toHaveBeenCalled();
  });
});
