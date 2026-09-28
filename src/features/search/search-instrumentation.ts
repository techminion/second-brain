import type { StructuredLogger } from "@/shared/lib/logger";
import type { Paginated, SearchResult } from "@/shared/types";

/** 02_PRD §6: full-text search p95 query-to-results budget (FR-SEARCH-4). */
export const fullTextSearchBudgetMs = 300;

/**
 * Times one full-text search and records it (FTS-08). Every call logs
 * `search.fulltext.completed` with the service-side duration and shape — the
 * series the p95 is computed from (OBS-03) — and a call over budget also logs
 * `search.fulltext.slow` at warn level, so regressions surface without a
 * dashboard. Content-free by construction (OBS-01): no query text, only
 * numbers and booleans. Failures are left to the request log and rethrown.
 */
export async function instrumentFullTextSearch(
  logger: StructuredLogger,
  details: { pageSize: number | undefined; paged: boolean },
  run: () => Promise<Paginated<SearchResult>>,
  now: () => number = () => performance.now(),
): Promise<Paginated<SearchResult>> {
  const startedAt = now();
  const page = await run();
  const durationMs = Math.round(now() - startedAt);
  const overBudget = durationMs > fullTextSearchBudgetMs;
  const metadata = {
    budgetMs: fullTextSearchBudgetMs,
    durationMs,
    hasMore: page.nextCursor !== undefined,
    overBudget,
    paged: details.paged,
    pageSize: details.pageSize ?? null,
    resultCount: page.items.length,
  };

  logger.info("search.fulltext.completed", metadata);
  if (overBudget) {
    logger.warn("search.fulltext.slow", metadata);
  }
  return page;
}
