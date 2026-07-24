import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  createNoteRequest,
  deleteNoteRequest,
  fetchNote,
  fetchNotesList,
  updateNoteRequest,
} from "./note-api";

function mockFetch(response: { ok: boolean; status?: number; body: unknown }) {
  const fetchMock = vi.fn(async () => ({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: async () => response.body,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("note-api", () => {
  it("unwraps the data envelope and builds the list query string", async () => {
    const page = { items: [{ id: "n1" }], nextCursor: "c2" };
    const fetchMock = mockFetch({ ok: true, body: { data: page } });

    const result = await fetchNotesList({ folderId: "f1", cursor: "c1", limit: 10 });

    expect(result).toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes?folderId=f1&cursor=c1&limit=10",
      expect.objectContaining({
        headers: expect.objectContaining({ "content-type": "application/json" }),
      }),
    );
  });

  it("omits query params that are absent", async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: { items: [] } } });

    await fetchNotesList();

    expect(fetchMock).toHaveBeenCalledWith("/api/notes", expect.any(Object));
  });

  it("throws a typed ApiError carrying status and code on a non-2xx response", async () => {
    mockFetch({
      ok: false,
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Note not found" } },
    });

    await expect(fetchNote("missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      code: "NOT_FOUND",
      message: "Note not found",
    });
    await expect(fetchNote("missing")).rejects.toBeInstanceOf(ApiError);
  });

  it("POSTs a create and returns the note", async () => {
    const note = { id: "n1", title: "Q3" };
    const fetchMock = mockFetch({ ok: true, status: 201, body: { data: note } });

    const result = await createNoteRequest({ title: "Q3" });

    expect(result).toEqual(note);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "Q3" }) }),
    );
  });

  it("PATCHes an update at the encoded id", async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: { id: "n1" } } });

    await updateNoteRequest("n 1", { title: "x" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes/n%201",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ title: "x" }) }),
    );
  });

  it("DELETEs a note", async () => {
    const fetchMock = mockFetch({ ok: true, body: { data: { id: "n1" } } });

    const result = await deleteNoteRequest("n1");

    expect(result).toEqual({ id: "n1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes/n1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
