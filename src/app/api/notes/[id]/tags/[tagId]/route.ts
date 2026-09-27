import { NextResponse } from "next/server";

import { noteRoute } from "@/features/notes/note-route";

interface RouteContext {
  params: Promise<{ id: string; tagId: string }>;
}

export async function DELETE(request: Request, { params }: RouteContext): Promise<Response> {
  const { id, tagId } = await params;
  return noteRoute("api.notes.tags.remove", async ({ service, userId }) =>
    NextResponse.json({ data: await service.removeTag(userId, id, tagId) }),
  )(request);
}
