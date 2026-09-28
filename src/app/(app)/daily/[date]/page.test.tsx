import { afterEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "@/shared/lib/errors";

import DailyNotePage from "./page";

const resolveSessionUserId = vi.fn();
const service = { getOrCreateDailyNote: vi.fn() };
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
const notFound = vi.fn(() => {
  throw new Error("not-found");
});

vi.mock("@/features/auth/resolve-user-id", () => ({
  resolveSessionUserId: () => resolveSessionUserId(),
}));
vi.mock("@/features/notes/note-service", () => ({
  createNoteService: () => Promise.resolve(service),
}));
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  redirect: (url: string) => redirect(url),
}));

function params(date: string) {
  return { params: Promise.resolve({ date }) };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("/daily/[date]", () => {
  it("gets or creates the date's note and redirects to it", async () => {
    resolveSessionUserId.mockResolvedValue("user-1");
    service.getOrCreateDailyNote.mockResolvedValue({ id: "n1" });

    await expect(DailyNotePage(params("2026-09-27"))).rejects.toThrow("redirect:/notes/n1");
    expect(service.getOrCreateDailyNote).toHaveBeenCalledWith("user-1", "2026-09-27");
  });

  it("404s an invalid date", async () => {
    resolveSessionUserId.mockResolvedValue("user-1");
    service.getOrCreateDailyNote.mockRejectedValue(new ValidationError("bad date"));

    await expect(DailyNotePage(params("nope"))).rejects.toThrow("not-found");
  });

  it("sends anonymous visitors to login", async () => {
    resolveSessionUserId.mockResolvedValue(null);

    await expect(DailyNotePage(params("2026-09-27"))).rejects.toThrow("redirect:/login");
    expect(service.getOrCreateDailyNote).not.toHaveBeenCalled();
  });
});
