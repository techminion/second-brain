import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const resolveSessionUserId = vi.fn();
const service = { create: vi.fn(), list: vi.fn() };

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));

vi.mock("@/features/notes/note-service", () => ({
  createNoteService: () => Promise.resolve(service),
}));

function get(url: string): Request {
  return new Request(url, { method: "GET" });
}

function post(body: unknown): Request {
  return new Request("https://example.test/api/notes", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("GET/POST /api/notes", () => {
  beforeEach(() => {
    resolveSessionUserId.mockResolvedValue("user-1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    service.create.mockReset();
    service.list.mockReset();
  });

  it("lists notes with the parsed query and returns the page envelope", async () => {
    const page = { items: [{ id: "n1" }], nextCursor: "next" };
    service.list.mockResolvedValue(page);

    const response = await GET(get("https://example.test/api/notes?folderId=f1&limit=10&cursor=c"));

    expect(service.list).toHaveBeenCalledWith("user-1", {
      folderId: "f1",
      cursor: "c",
      limit: 10,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: page });
  });

  it("creates a note and returns 201 with the note envelope", async () => {
    const note = { id: "n1", title: "Q3" };
    service.create.mockResolvedValue(note);

    const response = await POST(post({ title: "Q3", folderId: "f1" }));

    expect(service.create).toHaveBeenCalledWith("user-1", { title: "Q3", folderId: "f1" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: note });
  });

  it("returns 400 for a create body that is not a JSON object", async () => {
    const response = await POST(
      new Request("https://example.test/api/notes", { body: "oops", method: "POST" }),
    );

    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });
});
