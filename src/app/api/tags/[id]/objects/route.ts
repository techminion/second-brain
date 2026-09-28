import { NextResponse } from "next/server";

import { parsePaginationQuery } from "@/features/notes/note-request";
import { searchRoute } from "@/features/search/search-route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return searchRoute("api.tags.objects", async ({ request: req, service, userId }) => {
    const options = parsePaginationQuery(new URL(req.url).searchParams);
    return NextResponse.json({ data: await service.listByTag(userId, id, options) });
  })(request);
}
