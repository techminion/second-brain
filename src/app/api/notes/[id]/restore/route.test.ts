import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/shared/lib/errors";

import { POST } from "./route";

const resolveSessionUserId = vi.fn();
const service = { restore: vi.fn() };

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));

vi.mock("@/features/notes/note-service", () => ({
  createNoteService: () => Promise.resolve(service),
}));

const context = { params: Promise.resolve({ id: "n1" }) };

function request(): Request {
  return new Request("https://example.test/api/notes/n1/restore", { method: "POST" });
}

describe("/api/notes/[id]/restore", () => {
  beforeEach(() => {
    resolveSessionUserId.mockResolvedValue("user-1");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    service.restore.mockReset();
  });

  it("restores the route's note for the session user", async () => {
    const note = { id: "n1", title: "Back" };
    service.restore.mockResolvedValue(note);

    const response = await POST(request(), context);

    expect(service.restore).toHaveBeenCalledWith("user-1", "n1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: note });
  });

  it("maps expired or foreign trash to 404", async () => {
    service.restore.mockRejectedValue(new NotFoundError("Note not found"));

    const response = await POST(request(), context);

    expect(response.status).toBe(404);
  });

  it("returns 401 without a session", async () => {
    resolveSessionUserId.mockResolvedValue(null);

    const response = await POST(request(), context);

    expect(response.status).toBe(401);
    expect(service.restore).not.toHaveBeenCalled();
  });
});
