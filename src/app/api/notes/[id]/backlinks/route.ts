import { NextResponse } from "next/server";

import { noteRoute } from "@/features/notes/note-route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return noteRoute("api.notes.backlinks", async ({ service, userId }) =>
    NextResponse.json({ data: await service.getBacklinks(userId, id) }),
  )(request);
}
