import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CyclicMoveError, ValidationError } from "@/shared/lib/errors";

import { DELETE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

const resolveSessionUserId = vi.fn();
const service = {
  create: vi.fn(),
  delete: vi.fn(),
  getTree: vi.fn(),
  move: vi.fn(),
  rename: vi.fn(),
};

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));
vi.mock("@/features/folders/folder-service", () => ({
  createFolderService: () => Promise.resolve(service),
}));

const context = { params: Promise.resolve({ id: "f1" }) };

function jsonRequest(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method,
  });
}

describe("/api/folders", () => {
  beforeEach(() => {
    resolveSessionUserId.mockResolvedValue("user-1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.values(service).forEach((mock) => mock.mockReset());
  });

  it("returns the session user's tree", async () => {
    service.getTree.mockResolvedValue([{ id: "f1" }]);

    const response = await GET(new Request("https://x.test/api/folders"));

    expect(service.getTree).toHaveBeenCalledWith("user-1");
    expect(await response.json()).toEqual({ data: [{ id: "f1" }] });
  });

  it("creates a folder (201)", async () => {
    service.create.mockResolvedValue({ id: "f1" });

    const response = await POST(
      jsonRequest("POST", "https://x.test/api/folders", { name: "A", parentFolderId: null }),
    );

    expect(service.create).toHaveBeenCalledWith("user-1", { name: "A", parentFolderId: null });
    expect(response.status).toBe(201);
  });

  it("renames and/or moves via PATCH, mapping a cycle to 400", async () => {
    service.rename.mockResolvedValue({ id: "f1", name: "B" });
    await PATCH(jsonRequest("PATCH", "https://x.test/api/folders/f1", { name: "B" }), context);
    expect(service.rename).toHaveBeenCalledWith("user-1", "f1", "B");
    expect(service.move).not.toHaveBeenCalled();

    service.move.mockRejectedValue(new CyclicMoveError("cycle"));
    const response = await PATCH(
      jsonRequest("PATCH", "https://x.test/api/folders/f1", { parentFolderId: "f2" }),
      { params: Promise.resolve({ id: "f1" }) },
    );
    expect(service.move).toHaveBeenCalledWith("user-1", "f1", "f2");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "CYCLIC_MOVE", message: "cycle" } });
  });

  it("rejects an empty PATCH body", async () => {
    const response = await PATCH(jsonRequest("PATCH", "https://x.test/api/folders/f1", {}), {
      params: Promise.resolve({ id: "f1" }),
    });

    expect(response.status).toBe(400);
  });

  it("deletes with the strategy from the query string", async () => {
    service.delete.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("https://x.test/api/folders/f1?strategy=delete_contents", { method: "DELETE" }),
      { params: Promise.resolve({ id: "f1" }) },
    );

    expect(service.delete).toHaveBeenCalledWith("user-1", "f1", "delete_contents");
    expect(response.status).toBe(200);
  });

  it("surfaces a missing strategy as a validation error", async () => {
    service.delete.mockRejectedValue(new ValidationError("Strategy required"));

    const response = await DELETE(
      new Request("https://x.test/api/folders/f1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "f1" }) },
    );

    expect(service.delete).toHaveBeenCalledWith("user-1", "f1", null);
    expect(response.status).toBe(400);
  });

  it("401s without a session", async () => {
    resolveSessionUserId.mockResolvedValue(null);

    const response = await GET(new Request("https://x.test/api/folders"));

    expect(response.status).toBe(401);
    expect(service.getTree).not.toHaveBeenCalled();
  });
});
