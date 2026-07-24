import { describe, expect, it } from "vitest";

import { ValidationError } from "@/shared/lib/errors";

import { parseCreateNoteBody, parseListNotesQuery, parseUpdateNoteBody } from "./note-request";

function jsonRequest(body: unknown): Request {
  return new Request("https://example.test/api/notes", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function rawRequest(body: string): Request {
  return new Request("https://example.test/api/notes", { body, method: "POST" });
}

describe("parseCreateNoteBody", () => {
  it("passes through title, body, and folderId", async () => {
    const input = await parseCreateNoteBody(
      jsonRequest({ title: "Q3 Planning", body: "notes", folderId: "f_1" }),
    );

    expect(input).toEqual({ title: "Q3 Planning", body: "notes", folderId: "f_1" });
  });

  it("omits optional fields that are absent", async () => {
    const input = await parseCreateNoteBody(jsonRequest({ title: "Bare" }));

    expect(input).toEqual({ title: "Bare" });
    expect("body" in input).toBe(false);
    expect("folderId" in input).toBe(false);
  });

  it("rejects a non-JSON body", async () => {
    await expect(parseCreateNoteBody(rawRequest("not json"))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a JSON array or primitive body", async () => {
    await expect(parseCreateNoteBody(jsonRequest([1, 2]))).rejects.toBeInstanceOf(ValidationError);
    await expect(parseCreateNoteBody(jsonRequest("string"))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("parseUpdateNoteBody", () => {
  it("includes only the keys present in the request", async () => {
    const input = await parseUpdateNoteBody(jsonRequest({ title: "Renamed" }));

    expect(input).toEqual({ title: "Renamed" });
    expect("body" in input).toBe(false);
    expect("folderId" in input).toBe(false);
  });

  it("preserves an explicit folderId: null as a move-to-root", async () => {
    const input = await parseUpdateNoteBody(jsonRequest({ folderId: null }));

    expect("folderId" in input).toBe(true);
    expect(input.folderId).toBeNull();
  });

  it("rejects a non-object body", async () => {
    await expect(parseUpdateNoteBody(rawRequest("nope"))).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("parseListNotesQuery", () => {
  it("reads folderId, cursor, and numeric limit", () => {
    const options = parseListNotesQuery(
      new URLSearchParams({ folderId: "f_1", cursor: "abc", limit: "25" }),
    );

    expect(options).toEqual({ folderId: "f_1", cursor: "abc", limit: 25 });
  });

  it("omits empty folderId and cursor", () => {
    const options = parseListNotesQuery(new URLSearchParams({ folderId: "", cursor: "" }));

    expect(options).toEqual({});
  });

  it("forwards a malformed limit as NaN for the service to normalize", () => {
    const options = parseListNotesQuery(new URLSearchParams({ limit: "abc" }));

    expect(options.limit).toBeNaN();
  });
});
