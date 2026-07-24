import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/shared/lib/errors";

import { DELETE, GET, PATCH } from "./route";

const resolveSessionUserId = vi.fn();
const service = { delete: vi.fn(), get: vi.fn(), update: vi.fn() };

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));

vi.mock("@/features/notes/note-service", () => ({
  createNoteService: () => Promise.resolve(service),
}));

const context = { params: Promise.resolve({ id: "n1" }) };

function request(method: string, body?: unknown): Request {
  return new Request("https://example.test/api/notes/n1", {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method,
  });
}

describe("/api/notes/[id]", () => {
  beforeEach(() => {
    resolveSessionUserId.mockResolvedValue("user-1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    service.delete.mockReset();
    service.get.mockReset();
    service.update.mockReset();
  });

  it("gets a note by the route id", async () => {
    const note = { id: "n1", title: "Q3" };
    service.get.mockResolvedValue(note);

    const response = await GET(request("GET"), context);

    expect(service.get).toHaveBeenCalledWith("user-1", "n1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: note });
  });

  it("maps a NotFoundError from the service to 404", async () => {
    service.get.mockRejectedValue(new NotFoundError("Note not found"));

    const response = await GET(request("GET"), context);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Note not found" },
    });
  });

  it("updates a note with the parsed body", async () => {
    const note = { id: "n1", title: "Renamed" };
    service.update.mockResolvedValue(note);

    const response = await PATCH(request("PATCH", { title: "Renamed", folderId: null }), context);

    expect(service.update).toHaveBeenCalledWith("user-1", "n1", {
      title: "Renamed",
      folderId: null,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: note });
  });

  it("deletes a note and returns its id", async () => {
    service.delete.mockResolvedValue(undefined);

    const response = await DELETE(request("DELETE"), context);

    expect(service.delete).toHaveBeenCalledWith("user-1", "n1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { id: "n1" } });
  });
});
