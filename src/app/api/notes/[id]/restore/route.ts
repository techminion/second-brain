import { NextResponse } from "next/server";

import { noteRoute } from "@/features/notes/note-route";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  return noteRoute("api.notes.restore", async ({ service, userId }) =>
    NextResponse.json({ data: await service.restore(userId, id) }),
  )(request);
}
