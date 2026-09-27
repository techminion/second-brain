import { NextResponse } from "next/server";

import { searchRoute } from "@/features/search/search-route";

export const GET = searchRoute("api.search.titles", async ({ request, service, userId }) => {
  const params = new URL(request.url).searchParams;
  const limit = params.get("limit");
  return NextResponse.json({
    data: await service.suggestNoteTitles(
      userId,
      params.get("q") ?? "",
      limit === null ? undefined : Number(limit),
    ),
  });
});
