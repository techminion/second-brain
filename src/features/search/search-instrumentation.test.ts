import { describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "@/shared/lib/logger";

import { fullTextSearchBudgetMs, instrumentFullTextSearch } from "./search-instrumentation";

function logger() {
  return { error: vi.fn(), info: vi.fn(), warn: vi.fn() } satisfies StructuredLogger;
}

function clock(...readings: number[]) {
  return vi.fn(() => readings.shift() ?? 0);
}

const page = { items: [], nextCursor: "next" };

describe("instrumentFullTextSearch (FTS-08)", () => {
  it("logs duration and result shape, content-free, within budget", async () => {
    const log = logger();

    await expect(
      instrumentFullTextSearch(
        log,
        { pageSize: 20, paged: false },
        async () => page,
        clock(1000, 1042.4),
      ),
    ).resolves.toBe(page);

    expect(log.info).toHaveBeenCalledWith("search.fulltext.completed", {
      budgetMs: 300,
      durationMs: 42,
      hasMore: true,
      overBudget: false,
      paged: false,
      pageSize: 20,
      resultCount: 0,
    });
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("also warns when a search exceeds the FR-SEARCH-4 budget", async () => {
    const log = logger();

    await instrumentFullTextSearch(
      log,
      { pageSize: undefined, paged: true },
      async () => ({ items: [] }),
      clock(0, fullTextSearchBudgetMs + 1),
    );

    expect(log.warn).toHaveBeenCalledWith(
      "search.fulltext.slow",
      expect.objectContaining({ durationMs: 301, overBudget: true, pageSize: null, paged: true }),
    );
  });

  it("rethrows failures without logging a completion", async () => {
    const log = logger();
    const failure = new Error("boom");

    await expect(
      instrumentFullTextSearch(log, { pageSize: 5, paged: false }, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(log.info).not.toHaveBeenCalled();
  });

  it("only ever logs numbers, booleans and null (OBS-01 content-free contract)", async () => {
    const log = logger();

    await instrumentFullTextSearch(log, { pageSize: 10, paged: false }, async () => page);

    const [, metadata] = log.info.mock.lastCall as [string, Record<string, unknown>];
    for (const value of Object.values(metadata)) {
      expect(["number", "boolean"].includes(typeof value) || value === null).toBe(true);
    }
  });
});
