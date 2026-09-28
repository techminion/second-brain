import { NextResponse } from "next/server";

import { graphRoute } from "@/features/graph/graph-route";

export const GET = graphRoute("api.graph.global", async ({ request, service, userId }) => {
  const params = new URL(request.url).searchParams;
  return NextResponse.json({
    data: await service.getGraph(userId, {
      folderId: params.get("folderId") ?? undefined,
      tagId: params.get("tagId") ?? undefined,
    }),
  });
});
