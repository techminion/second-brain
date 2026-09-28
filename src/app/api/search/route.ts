import { NextResponse } from "next/server";

import { searchRoute } from "@/features/search/search-route";

/**
 * Full-text search over the caller's notes (FTS-04, 05_API §6):
 * `GET /api/search?q=<query>&cursor=<opaque>&limit=<n>`. An empty `q` is a
 * ValidationError (400) from the service.
 */
export const GET = searchRoute("api.search", async ({ request, service, userId }) => {
  const params = new URL(request.url).searchParams;
  const limit = params.get("limit");
  return NextResponse.json({
    data: await service.search(userId, params.get("q") ?? "", {
      cursor: params.get("cursor") ?? undefined,
      limit: limit === null ? undefined : Number(limit),
    }),
  });
});
