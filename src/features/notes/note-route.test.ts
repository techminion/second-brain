import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/shared/lib/errors";

import { noteRoute } from "./note-route";

const resolveSessionUserId = vi.fn();
const createNoteService = vi.fn();

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));

vi.mock("@/features/notes/note-service", () => ({
  createNoteService: () => createNoteService(),
}));

function request(): Request {
  return new Request("https://example.test/api/notes", { method: "GET" });
}

describe("noteRoute", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resolveSessionUserId.mockReset();
    createNoteService.mockReset();
  });

  it("returns 401 without building a service when there is no session", async () => {
    resolveSessionUserId.mockResolvedValue(null);

    const response = await noteRoute("api.notes.test", async () => new Response())(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Authentication required." },
    });
    expect(createNoteService).not.toHaveBeenCalled();
  });

  it("passes the resolved user id and service to the handler", async () => {
    resolveSessionUserId.mockResolvedValue("user-1");
    const service = { get: vi.fn() };
    createNoteService.mockResolvedValue(service);
    const handler = vi.fn(async () => Response.json({ ok: true }));

    await noteRoute("api.notes.test", handler)(request());

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ service, userId: "user-1" }),
    );
  });

  it("translates a thrown ServiceError to its HTTP status", async () => {
    resolveSessionUserId.mockResolvedValue("user-1");
    createNoteService.mockResolvedValue({});

    const response = await noteRoute("api.notes.test", async () => {
      throw new NotFoundError("Note not found");
    })(request());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Note not found" },
    });
  });

  it("degrades an unexpected error to a logged 500", async () => {
    resolveSessionUserId.mockResolvedValue("user-1");
    createNoteService.mockResolvedValue({});

    const response = await noteRoute("api.notes.test", async () => {
      throw new Error("boom");
    })(request());

    expect(response.status).toBe(500);
  });
});
