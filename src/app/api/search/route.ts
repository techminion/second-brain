import { NextResponse } from "next/server";

import { instrumentFullTextSearch } from "@/features/search/search-instrumentation";
import { searchRoute } from "@/features/search/search-route";

/**
 * Full-text search over the caller's notes (FTS-04, 05_API §6):
 * `GET /api/search?q=<query>&cursor=<opaque>&limit=<n>`. An empty `q` is a
 * ValidationError (400) from the service. Each search is timed against the
 * FR-SEARCH-4 budget (FTS-08).
 */
export const GET = searchRoute("api.search", async ({ logger, request, service, userId }) => {
  const params = new URL(request.url).searchParams;
  const limit = params.get("limit");
  const cursor = params.get("cursor") ?? undefined;
  const pageSize = limit === null ? undefined : Number(limit);

  const page = await instrumentFullTextSearch(
    logger,
    { pageSize: Number.isFinite(pageSize) ? pageSize : undefined, paged: cursor !== undefined },
    () => service.search(userId, params.get("q") ?? "", { cursor, limit: pageSize }),
  );
  return NextResponse.json({ data: page });
});
