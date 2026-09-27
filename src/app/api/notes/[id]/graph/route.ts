import { NextResponse } from "next/server";

import { graphRoute } from "@/features/graph/graph-route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return graphRoute("api.notes.graph", async ({ request: req, service, userId }) => {
    const depth = Number(new URL(req.url).searchParams.get("depth") ?? 1);
    return NextResponse.json({ data: await service.getLocalGraph(userId, id, depth) });
  })(request);
}
